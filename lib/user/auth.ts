import "server-only";

import {createHash, randomBytes, scryptSync, timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";

import {createAdminClient} from "@/lib/supabase/admin";
import type {UserAccountRow} from "@/lib/types";

const USER_ACCOUNTS_TABLE = "user_accounts";
const USER_SESSIONS_TABLE = "user_sessions";
export const USER_SESSION_COOKIE = "agwn_user_session";

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashUserPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyUserPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64).toString("hex");
  const provided = Buffer.from(candidate);
  const expected = Buffer.from(storedHash);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function findUserByUsername(username: string): Promise<UserAccountRow | null> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(USER_ACCOUNTS_TABLE)
    .select("*")
    .eq("username", username.trim())
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user account:", error);
    return null;
  }

  return (data as UserAccountRow | null) ?? null;
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const sessionTokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const supabase = createAdminClient();
  const {error} = await supabase.from(USER_SESSIONS_TABLE).insert({
    user_id: userId,
    session_token_hash: sessionTokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`创建用户会话失败: ${error.message}`);
  }

  return {token, expiresAt};
}

export async function clearUserSession(token: string) {
  const supabase = createAdminClient();
  await supabase.from(USER_SESSIONS_TABLE).delete().eq("session_token_hash", hashSessionToken(token));
}

export function getUserSessionCookieOptions(expiresAt?: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt ? new Date(expiresAt) : undefined,
  };
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(USER_SESSION_COOKIE)?.value ?? "";

  if (!sessionToken) {
    return null;
  }

  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(USER_SESSIONS_TABLE)
    .select("user_id, expires_at")
    .eq("session_token_hash", hashSessionToken(sessionToken))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const user = await supabase
    .from(USER_ACCOUNTS_TABLE)
    .select("*")
    .eq("id", data.user_id)
    .eq("is_active", true)
    .maybeSingle();

  if (user.error || !user.data) {
    return null;
  }

  return user.data as UserAccountRow;
}
