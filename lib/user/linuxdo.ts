import "server-only";

import {randomBytes} from "node:crypto";

import {buildAppUrl} from "@/lib/utils/request-url";

const DEFAULT_LINUXDO_AUTHORIZATION_URL = "https://connect.linux.do/oauth2/authorize";
const DEFAULT_LINUXDO_TOKEN_URL = "https://connect.linuxdo.org/oauth2/token";
const DEFAULT_LINUXDO_PROFILE_URL = "https://connect.linuxdo.org/api/user";

export const USER_OAUTH_STATE_COOKIE = "agwn_user_oauth_state";
export const USER_OAUTH_REDIRECT_COOKIE = "agwn_user_oauth_redirect";
export const USER_OAUTH_INVITE_COOKIE = "agwn_user_oauth_invite_code";
export const USER_OAUTH_PENDING_TOKEN_COOKIE = "agwn_user_oauth_pending_token";
export const USER_OAUTH_PENDING_PROFILE_COOKIE = "agwn_user_oauth_pending_profile";
export const USER_OAUTH_PENDING_REDIRECT_COOKIE = "agwn_user_oauth_pending_redirect";

const SAFE_USER_ERROR_MESSAGES = [
  "未开启注册",
  "邀请码无效或已失效",
  "请输入邀请码",
  "邀请码会话已失效，请重新登录",
  "OAuth 回调校验失败",
  "该用户已被禁用",
  "Linux.do 返回的用户资料缺少必要字段",
];

function requireEnv(name: string) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function encodeBasicAuth(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function resolveLinuxdoEndpoints() {
  return {
    authorizationUrl:
      process.env.LINUXDO_OAUTH_AUTHORIZATION_URL?.trim() || DEFAULT_LINUXDO_AUTHORIZATION_URL,
    tokenUrl: process.env.LINUXDO_OAUTH_TOKEN_URL?.trim() || DEFAULT_LINUXDO_TOKEN_URL,
    profileUrl: process.env.LINUXDO_OAUTH_USERINFO_URL?.trim() || DEFAULT_LINUXDO_PROFILE_URL,
  };
}

function toLinuxdoFetchError(error: unknown, phase: "token" | "profile") {
  const fallbackMessage =
    phase === "token"
      ? "Linux.do 授权服务暂时不可用，请稍后重试"
      : "Linux.do 用户资料服务暂时不可用，请稍后重试";

  if (
    error instanceof TypeError &&
    typeof error.cause === "object" &&
    error.cause &&
    "code" in error.cause &&
    error.cause.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
  ) {
    return new Error(
      phase === "token"
        ? "连接 Linux.do token 服务失败：当前 Node.js 无法校验证书链，请改用 connect.linuxdo.org 或修复本机证书环境。"
        : "连接 Linux.do 用户资料服务失败：当前 Node.js 无法校验证书链，请改用 connect.linuxdo.org 或修复本机证书环境。"
    );
  }

  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase();
    if (normalized === "fetch failed" || normalized.includes("failed to fetch")) {
      return new Error(fallbackMessage);
    }
    return error;
  }

  return new Error(fallbackMessage);
}

function buildLinuxdoResponseError(
  phase: "token" | "profile",
  response: Response,
  detail: "non_json" | "invalid_json"
) {
  const contentType = response.headers.get("content-type")?.trim() || "unknown";
  const label = phase === "token" ? "token" : "用户资料";

  if (detail === "non_json") {
    return new Error(
      `Linux.do ${label}服务返回了非 JSON 响应（status=${response.status}, content-type=${contentType}）`
    );
  }

  return new Error(
    `Linux.do ${label}服务返回了无法解析的 JSON（status=${response.status}, content-type=${contentType}）`
  );
}

async function parseLinuxdoJsonResponse<T>(response: Response, phase: "token" | "profile") {
  const contentType = response.headers.get("content-type")?.trim().toLowerCase() ?? "";
  const rawText = await response.text();

  if (!contentType.includes("application/json")) {
    throw buildLinuxdoResponseError(phase, response, "non_json");
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw buildLinuxdoResponseError(phase, response, "invalid_json");
  }
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

function resolveLinuxdoCallbackUrl(request?: Request) {
  const configuredCallbackUrl = process.env.LINUXDO_OAUTH_CALLBACK_URL?.trim() ?? "";
  if (configuredCallbackUrl) {
    try {
      const configuredUrl = new URL(configuredCallbackUrl);
      if (!request || !isLoopbackHostname(configuredUrl.hostname)) {
        return configuredUrl.toString();
      }
    } catch {
      if (!request) {
        return configuredCallbackUrl;
      }
    }
  }

  if (request) {
    return buildAppUrl(request, "/api/user/oauth/linuxdo/callback").toString();
  }

  if (configuredCallbackUrl) {
    return configuredCallbackUrl;
  }

  throw new Error("缺少环境变量 LINUXDO_OAUTH_CALLBACK_URL");
}

export function getLinuxdoOAuthConfig(request?: Request) {
  const endpoints = resolveLinuxdoEndpoints();
  return {
    clientId: requireEnv("LINUXDO_OAUTH_CLIENT_ID"),
    clientSecret: requireEnv("LINUXDO_OAUTH_CLIENT_SECRET"),
    callbackUrl: resolveLinuxdoCallbackUrl(request),
    scope: process.env.LINUXDO_OAUTH_SCOPE?.trim() || "",
    ...endpoints,
  };
}

export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function buildLinuxdoAuthorizationURL(state: string, request?: Request) {
  const config = getLinuxdoOAuthConfig(request);
  const url = new URL(config.authorizationUrl);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.callbackUrl);
  if (config.scope) {
    url.searchParams.set("scope", config.scope);
  }
  url.searchParams.set("state", state);

  return url.toString();
}

export function sanitizeUserRedirectPath(value: string | null | undefined) {
  const target = value?.trim() ?? "";

  if (!target.startsWith("/") || target.startsWith("//")) {
    return "/user";
  }

  return target;
}

export function toPublicUserAuthErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) {
    return fallback;
  }

  const normalized = message.toLowerCase();
  if (normalized === "fetch failed" || normalized.includes("failed to fetch")) {
    return fallback;
  }

  if (SAFE_USER_ERROR_MESSAGES.includes(message)) {
    return message;
  }

  if (message.includes("Linux.do")) {
    return message;
  }

  return fallback;
}

export async function exchangeLinuxdoCode(code: string, request?: Request) {
  const config = getLinuxdoOAuthConfig(request);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.callbackUrl,
  });

  let response: Response;
  try {
    response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodeBasicAuth(config.clientId, config.clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch (error) {
    throw toLinuxdoFetchError(error, "token");
  }

  const result = await parseLinuxdoJsonResponse<{
    access_token?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  }>(response, "token");

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || "Linux.do token 获取失败");
  }

  return result.access_token;
}

export async function fetchLinuxdoProfile(accessToken: string) {
  const {profileUrl} = resolveLinuxdoEndpoints();
  let response: Response;
  try {
    response = await fetch(profileUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    throw toLinuxdoFetchError(error, "profile");
  }

  const result = await parseLinuxdoJsonResponse<Record<string, unknown>>(response, "profile");
  if (!response.ok) {
    throw new Error("Linux.do 用户资料获取失败");
  }

  return result;
}

function readNestedString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function readNestedNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeLinuxdoProfile(profile: Record<string, unknown>) {
  const nestedUser =
    typeof profile.user === "object" && profile.user
      ? (profile.user as Record<string, unknown>)
      : null;

  const subject =
    readNestedString(profile, "sub") ||
    String(readNestedNumber(profile, "id") ?? "") ||
    readNestedString(profile, "user_id") ||
    (nestedUser
      ? readNestedString(nestedUser, "sub") ||
        String(readNestedNumber(nestedUser, "id") ?? "") ||
        readNestedString(nestedUser, "user_id")
      : "");

  const username =
    readNestedString(profile, "username") ||
    readNestedString(profile, "preferred_username") ||
    (nestedUser
      ? readNestedString(nestedUser, "username") ||
        readNestedString(nestedUser, "preferred_username")
      : "");

  const displayName =
    readNestedString(profile, "name") ||
    readNestedString(profile, "display_name") ||
    (nestedUser
      ? readNestedString(nestedUser, "name") || readNestedString(nestedUser, "display_name")
      : "") ||
    username;

  let avatarUrl =
    readNestedString(profile, "avatar_url") ||
    readNestedString(profile, "avatar_template") ||
    (nestedUser
      ? readNestedString(nestedUser, "avatar_url") || readNestedString(nestedUser, "avatar_template")
      : "");

  if (avatarUrl.includes("{size}")) {
    avatarUrl = avatarUrl.replaceAll("{size}", "256");
  }

  if (!subject || !username) {
    throw new Error("Linux.do 返回的用户资料缺少必要字段");
  }

  return {
    subject,
    username,
    displayName,
    avatarUrl: avatarUrl || null,
    profileRaw: profile,
  };
}
