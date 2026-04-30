import "server-only";

import {createHmac, timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";

import {getAuthenticatedUser} from "@/lib/user/auth";

export const ADMIN_SESSION_COOKIE = "agwn_admin_session";

function getAdminPasswordValue() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function buildAdminSessionToken(password: string) {
  return createHmac("sha256", password).update("agwn-admin-session-v1").digest("hex");
}

export function isAdminPasswordConfigured() {
  return getAdminPasswordValue().length > 0;
}

export function verifyAdminPassword(password: string) {
  const configuredPassword = getAdminPasswordValue();
  if (!configuredPassword) {
    return false;
  }

  const provided = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function createAdminSessionCookieValue() {
  const configuredPassword = getAdminPasswordValue();
  if (!configuredPassword) {
    throw new Error("ADMIN_PASSWORD 未配置");
  }

  return buildAdminSessionToken(configuredPassword);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function hasAdminRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() === "admin";
}

export async function isAdminAuthenticated() {
  const authenticatedUser = await getAuthenticatedUser();
  if (authenticatedUser?.is_active && hasAdminRole(authenticatedUser.role)) {
    return true;
  }

  if (!isAdminPasswordConfigured()) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  const expectedValue = createAdminSessionCookieValue();
  const provided = Buffer.from(sessionValue);
  const expected = Buffer.from(expectedValue);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
