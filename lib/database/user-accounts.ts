import "server-only";

import {randomBytes} from "node:crypto";

import {createAdminClient} from "@/lib/supabase/admin";
import {hashUserPassword} from "@/lib/user/auth";

const USER_ACCOUNTS_TABLE = "user_accounts";

export interface AdminUserAccountRow {
  id: string;
  username: string;
  display_name: string;
  auth_source?: "manual" | "linuxdo";
  oauth_provider?: string | null;
  oauth_subject?: string | null;
  oauth_username?: string | null;
  avatar_url?: string | null;
  last_login_at?: string | null;
  role: "user" | "admin";
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserAccountInput {
  id?: string;
  username: string;
  display_name: string;
  role: "user" | "admin";
  is_active: boolean;
  password?: string;
}

interface PersistedUserAccountRow extends AdminUserAccountRow {
  password_hash: string;
  profile_raw?: Record<string, unknown> | null;
}

function normalizeUser(input: UserAccountInput) {
  return {
    id: input.id,
    username: input.username.trim(),
    display_name: input.display_name.trim() || input.username.trim(),
    role: input.role,
    is_active: Boolean(input.is_active),
    password: input.password?.trim() ?? "",
  };
}

function isMissingTableError(error: {code?: string; message?: string} | null | undefined) {
  return error?.code === "PGRST205" || error?.message?.includes(USER_ACCOUNTS_TABLE);
}

export async function loadAdminUserAccounts(): Promise<AdminUserAccountRow[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(USER_ACCOUNTS_TABLE)
    .select("id, username, display_name, auth_source, oauth_provider, oauth_subject, oauth_username, avatar_url, last_login_at, role, is_active, created_at, updated_at")
    .order("created_at", {ascending: true});

  if (error) {
    if (!isMissingTableError(error)) {
      console.error("Failed to load user accounts:", error);
    }
    return [];
  }

  return ((data as AdminUserAccountRow[] | null) ?? []).map((row) => ({
    ...row,
    auth_source: row.auth_source === "linuxdo" ? "linuxdo" : "manual",
    role: row.role === "admin" ? "admin" : "user",
  }));
}

export async function findUserAccountForOAuthIdentity(input: {
  provider: "linuxdo";
  subject: string;
  username: string;
}) {
  const supabase = createAdminClient();
  const subject = input.subject.trim();
  const username = input.username.trim();

  if (!subject || !username) {
    return null;
  }

  const {data, error} = await supabase
    .from(USER_ACCOUNTS_TABLE)
    .select("*")
    .or(`oauth_subject.eq.${subject},username.eq.${username}`)
    .limit(5);

  if (error) {
    throw new Error(`读取 OAuth 用户失败: ${error.message}`);
  }

  const rows = (data as PersistedUserAccountRow[] | null) ?? [];
  return (
    rows.find((row) => row.oauth_provider === input.provider && row.oauth_subject === subject) ??
    rows.find((row) => row.username === username) ??
    null
  );
}

export async function saveAdminUserAccounts(inputs: UserAccountInput[]): Promise<AdminUserAccountRow[]> {
  const supabase = createAdminClient();
  const normalized = inputs
    .map(normalizeUser)
    .filter((item) => item.username.length > 0);

  const {data: existingData, error: existingError} = await supabase
    .from(USER_ACCOUNTS_TABLE)
    .select("id, username, display_name, auth_source, oauth_provider, oauth_subject, oauth_username, avatar_url, last_login_at, role, is_active, password_hash, profile_raw, created_at, updated_at");

  if (existingError) {
    if (isMissingTableError(existingError)) {
      throw new Error("user_accounts 表不存在，请先执行 supabase/schema.sql。");
    }
    throw new Error(`读取用户账户失败: ${existingError.message}`);
  }

  const existingRows = (existingData as PersistedUserAccountRow[] | null) ?? [];
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const existingByUsername = new Map(existingRows.map((row) => [row.username, row]));

  if (normalized.length === 0) {
    const {error} = await supabase.from(USER_ACCOUNTS_TABLE).delete().not("username", "is", null);
    if (error) {
      throw new Error(`清空用户账户失败: ${error.message}`);
    }
    return [];
  }

  const payload = normalized.map((item) => {
    const existing = (item.id && existingById.get(item.id)) || existingByUsername.get(item.username);
    const passwordHash = item.password
      ? hashUserPassword(item.password)
      : existing?.password_hash ?? hashUserPassword(randomBytes(18).toString("base64url"));

    if (!passwordHash) {
      throw new Error(`用户 ${item.username} 缺少初始密码`);
    }

    return {
      username: item.username,
      display_name: item.display_name,
      auth_source: existing?.auth_source ?? "manual",
      oauth_provider: existing?.oauth_provider ?? null,
      oauth_subject: existing?.oauth_subject ?? null,
      oauth_username: existing?.oauth_username ?? null,
      avatar_url: existing?.avatar_url ?? null,
      last_login_at: existing?.last_login_at ?? null,
      profile_raw: existing?.profile_raw ?? {},
      role: item.role,
      is_active: item.is_active,
      password_hash: passwordHash,
    };
  });

  const {error} = await supabase.from(USER_ACCOUNTS_TABLE).upsert(payload, {
    onConflict: "username",
  });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("user_accounts 表不存在，请先执行 supabase/schema.sql。");
    }
    throw new Error(`保存用户账户失败: ${error.message}`);
  }

  const keepUsernames = payload.map((item) => item.username);
  const removeUsernames = existingRows
    .map((row) => row.username)
    .filter((username) => !keepUsernames.includes(username));

  if (removeUsernames.length > 0) {
    const {error: deleteError} = await supabase.from(USER_ACCOUNTS_TABLE).delete().in("username", removeUsernames);
    if (deleteError) {
      throw new Error(`删除旧用户失败: ${deleteError.message}`);
    }
  }

  return loadAdminUserAccounts();
}

export interface OAuthUserUpsertInput {
  provider: "linuxdo";
  subject: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  profileRaw: Record<string, unknown>;
}

export async function upsertOAuthUserAccount(input: OAuthUserUpsertInput) {
  const supabase = createAdminClient();
  const provider = input.provider;
  const subject = input.subject.trim();
  const username = input.username.trim();
  const displayName = input.displayName.trim() || username;

  if (!subject || !username) {
    throw new Error("OAuth 用户信息不完整");
  }

  const matched = await findUserAccountForOAuthIdentity({
    provider,
    subject,
    username,
  });

  const payload = {
    username,
    display_name: displayName,
    auth_source: "linuxdo",
    oauth_provider: provider,
    oauth_subject: subject,
    oauth_username: username,
    avatar_url: input.avatarUrl?.trim() || null,
    profile_raw: input.profileRaw,
    last_login_at: new Date().toISOString(),
    role: matched?.role === "admin" ? "admin" : "user",
    is_active: matched?.is_active ?? true,
    password_hash: matched?.password_hash ?? hashUserPassword(randomBytes(18).toString("base64url")),
  };

  const mutation = matched
    ? supabase.from(USER_ACCOUNTS_TABLE).update(payload).eq("id", matched.id)
    : supabase.from(USER_ACCOUNTS_TABLE).insert(payload);

  const {data, error} = await mutation.select("*").single();

  if (error) {
    throw new Error(`保存 OAuth 用户失败: ${error.message}`);
  }

  const user = data as PersistedUserAccountRow;
  if (!user.is_active) {
    throw new Error("该用户已被禁用");
  }

  return user;
}

export async function deleteAdminUserAccount(id: string) {
  const supabase = createAdminClient();
  const targetId = id.trim();

  if (!targetId) {
    throw new Error("缺少用户 ID");
  }

  const {error} = await supabase
    .from(USER_ACCOUNTS_TABLE)
    .delete()
    .eq("id", targetId);

  if (error) {
    throw new Error(`删除用户失败: ${error.message}`);
  }

  return loadAdminUserAccounts();
}
