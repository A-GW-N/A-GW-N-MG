import "server-only";

import {randomBytes} from "node:crypto";

import {createAdminClient} from "@/lib/supabase/admin";
import type {UserInviteCodeRow, UserRegistrationSettingsRow} from "@/lib/types";

const REGISTRATION_SETTINGS_TABLE = "user_registration_settings";
const USER_INVITE_CODES_TABLE = "user_invite_codes";

export type RegistrationMode = "closed" | "open" | "invite_only";

export interface UserRegistrationSettingsInput {
  registration_mode: RegistrationMode;
  invite_code_hint?: string | null;
}

function isMissingTableError(error: {code?: string; message?: string} | null | undefined, tableName: string) {
  return error?.code === "PGRST205" || error?.message?.includes(tableName);
}

function buildDefaultSettings(): UserRegistrationSettingsRow {
  return {
    settings_key: "main",
    registration_mode: "closed",
    invite_code_hint: "",
  };
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function buildInviteCode() {
  return `AGWN-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function loadUserRegistrationSettings(): Promise<UserRegistrationSettingsRow> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(REGISTRATION_SETTINGS_TABLE)
    .select("*")
    .eq("settings_key", "main")
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error, REGISTRATION_SETTINGS_TABLE)) {
      console.error("Failed to load user registration settings:", error);
    }
    return buildDefaultSettings();
  }

  return (data as UserRegistrationSettingsRow | null) ?? buildDefaultSettings();
}

export async function saveUserRegistrationSettings(
  input: UserRegistrationSettingsInput
): Promise<UserRegistrationSettingsRow> {
  const supabase = createAdminClient();
  const payload = {
    settings_key: "main",
    registration_mode: input.registration_mode,
    invite_code_hint: input.invite_code_hint?.trim() || null,
  };

  const {data, error} = await supabase
    .from(REGISTRATION_SETTINGS_TABLE)
    .upsert(payload, {onConflict: "settings_key"})
    .select("*")
    .single();

  if (error) {
    throw new Error(`保存注册设置失败: ${error.message}`);
  }

  return data as UserRegistrationSettingsRow;
}

export async function loadUserInviteCodes(): Promise<UserInviteCodeRow[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(USER_INVITE_CODES_TABLE)
    .select("*")
    .order("created_at", {ascending: false});

  if (error) {
    if (!isMissingTableError(error, USER_INVITE_CODES_TABLE)) {
      console.error("Failed to load user invite codes:", error);
    }
    return [];
  }

  return (data as UserInviteCodeRow[] | null) ?? [];
}

export async function createUserInviteCode(input?: {
  code?: string;
  note?: string | null;
  expires_at?: string | null;
}) {
  const supabase = createAdminClient();
  const payload = {
    code: normalizeCode(input?.code?.trim() || buildInviteCode()),
    note: input?.note?.trim() || null,
    expires_at: input?.expires_at?.trim() || null,
    is_enabled: true,
  };

  if (!payload.code) {
    throw new Error("邀请码不能为空");
  }

  const {error} = await supabase.from(USER_INVITE_CODES_TABLE).insert(payload);

  if (error) {
    throw new Error(`创建邀请码失败: ${error.message}`);
  }

  return loadUserInviteCodes();
}

export async function deleteUserInviteCode(id: string) {
  const supabase = createAdminClient();
  const targetId = id.trim();

  if (!targetId) {
    throw new Error("缺少邀请码 ID");
  }

  const {error} = await supabase
    .from(USER_INVITE_CODES_TABLE)
    .delete()
    .eq("id", targetId);

  if (error) {
    throw new Error(`删除邀请码失败: ${error.message}`);
  }

  return loadUserInviteCodes();
}

export async function findAvailableUserInviteCode(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return null;
  }

  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(USER_INVITE_CODES_TABLE)
    .select("*")
    .eq("code", normalized)
    .eq("is_enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(`读取邀请码失败: ${error.message}`);
  }

  const row = data as UserInviteCodeRow | null;
  if (!row) {
    return null;
  }

  if (row.used_at) {
    return null;
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return row;
}

export async function consumeUserInviteCode(id: string, userId: string) {
  const supabase = createAdminClient();
  const {error} = await supabase
    .from(USER_INVITE_CODES_TABLE)
    .update({
      used_by_user_id: userId,
      used_at: new Date().toISOString(),
      is_enabled: false,
    })
    .eq("id", id)
    .is("used_at", null);

  if (error) {
    throw new Error(`核销邀请码失败: ${error.message}`);
  }
}
