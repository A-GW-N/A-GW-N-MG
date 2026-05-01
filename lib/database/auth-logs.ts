import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import {sanitizeSensitiveText} from "@/lib/security/sanitize-sensitive-text";
import type {AuthEventLogRow} from "@/lib/types";
import {buildPublicRequestUrl} from "@/lib/utils/request-url";

const AUTH_EVENT_LOGS_TABLE = "auth_event_logs";

export interface AuthEventInput {
  category: AuthEventLogRow["category"];
  event_type: string;
  success: boolean;
  auth_scope: AuthEventLogRow["auth_scope"];
  actor_user_id?: string | null;
  actor_username?: string | null;
  actor_display_name?: string | null;
  actor_role?: string | null;
  provider?: string | null;
  target_path?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdminAuthEventLog extends AuthEventLogRow {
  metadata: Record<string, unknown>;
}

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? sanitizeSensitiveText(trimmed) : null;
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeSensitiveText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadataValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeMetadataValue(entry)])
    );
  }

  return value;
}

function sanitizeQueryValue(key: string, value: string) {
  const loweredKey = key.trim().toLowerCase();
  if (
    loweredKey.includes("key") ||
    loweredKey.includes("token") ||
    loweredKey.includes("secret") ||
    loweredKey.includes("password") ||
    loweredKey.includes("code")
  ) {
    return "[redacted]";
  }

  return sanitizeSensitiveText(value.trim());
}

function sanitizeQueryEntries(requestUrl: URL) {
  const entries = Array.from(requestUrl.searchParams.entries());
  if (entries.length === 0) {
    return {};
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [key, sanitizeQueryValue(key, value)])
  );
}

function listPresentCookies(rawCookieHeader: string | null) {
  if (!rawCookieHeader) {
    return [];
  }

  return rawCookieHeader
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function mergeMetadata(
  base: Record<string, unknown>,
  extra: Record<string, unknown>
) {
  return {...base, ...extra};
}

function buildRequestContextMetadata(request?: Request | null) {
  if (!request) {
    return {};
  }

  const requestUrl = new URL(request.url);
  const publicRequestUrl = buildPublicRequestUrl(request);
  const cookieHeader = request.headers.get("cookie");
  const presentCookies = listPresentCookies(cookieHeader);

  return {
    request_method: request.method,
    request_path: publicRequestUrl.pathname,
    request_query: sanitizeQueryEntries(requestUrl),
    request_host: publicRequestUrl.host,
    request_protocol: publicRequestUrl.protocol.replace(":", ""),
    request_origin: publicRequestUrl.origin,
    request_internal_host: requestUrl.host,
    request_internal_origin: requestUrl.origin,
    request_referrer: sanitizeSensitiveText(request.headers.get("referer")?.trim() ?? ""),
    request_content_type: sanitizeSensitiveText(request.headers.get("content-type")?.trim() ?? ""),
    request_accept: sanitizeSensitiveText(request.headers.get("accept")?.trim() ?? ""),
    request_accept_language: sanitizeSensitiveText(
      request.headers.get("accept-language")?.trim() ?? ""
    ),
    request_sec_fetch_site: request.headers.get("sec-fetch-site")?.trim() ?? "",
    request_sec_fetch_mode: request.headers.get("sec-fetch-mode")?.trim() ?? "",
    request_sec_fetch_dest: request.headers.get("sec-fetch-dest")?.trim() ?? "",
    request_origin_header: sanitizeSensitiveText(request.headers.get("origin")?.trim() ?? ""),
    x_forwarded_for: request.headers.get("x-forwarded-for")?.trim() ?? "",
    x_forwarded_host: request.headers.get("x-forwarded-host")?.trim() ?? "",
    x_forwarded_proto: request.headers.get("x-forwarded-proto")?.trim() ?? "",
    x_real_ip: request.headers.get("x-real-ip")?.trim() ?? "",
    cf_connecting_ip: request.headers.get("cf-connecting-ip")?.trim() ?? "",
    cf_ray: request.headers.get("cf-ray")?.trim() ?? "",
    cookie_names: presentCookies,
    cookie_count: presentCookies.length,
  };
}

function extractClientInfo(request?: Request | null) {
  if (!request) {
    return {
      ipAddress: null,
      userAgent: null,
    };
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const realIp = request.headers.get("x-real-ip")?.trim() ?? "";
  const cfIp = request.headers.get("cf-connecting-ip")?.trim() ?? "";

  return {
    ipAddress: forwardedFor || realIp || cfIp || null,
    userAgent: request.headers.get("user-agent")?.trim() ?? null,
  };
}

export async function recordAuthEvent(
  input: AuthEventInput,
  options?: {request?: Request | null}
) {
  try {
    const supabase = createAdminClient();
    const clientInfo = extractClientInfo(options?.request);
    const requestMetadata = buildRequestContextMetadata(options?.request);
    const metadata = mergeMetadata(
      requestMetadata,
      ((sanitizeMetadataValue(input.metadata ?? {}) as Record<string, unknown>) ?? {})
    );

    const payload = {
      category: input.category,
      event_type: input.event_type.trim(),
      success: input.success,
      auth_scope: input.auth_scope,
      actor_user_id: input.actor_user_id?.trim() || null,
      actor_username: normalizeString(input.actor_username),
      actor_display_name: normalizeString(input.actor_display_name),
      actor_role: normalizeString(input.actor_role),
      provider: normalizeString(input.provider),
      target_path: normalizeString(input.target_path),
      ip_address: normalizeString(input.ip_address) ?? clientInfo.ipAddress,
      user_agent: normalizeString(input.user_agent) ?? normalizeString(clientInfo.userAgent),
      message: normalizeString(input.message),
      metadata,
    };

    const {error} = await supabase.from(AUTH_EVENT_LOGS_TABLE).insert(payload);
    if (error) {
      console.error("Failed to record auth event:", error);
    }
  } catch (error) {
    console.error("Failed to record auth event:", error);
  }
}

export async function loadAdminAuthEventLogs(limit = 200): Promise<AdminAuthEventLog[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(AUTH_EVENT_LOGS_TABLE)
    .select("*")
    .order("created_at", {ascending: false})
    .limit(limit);

  if (error) {
    console.error("Failed to load auth event logs:", error);
    return [];
  }

  return (((data as AuthEventLogRow[] | null) ?? [])).map((row) => ({
    ...row,
    message: normalizeString(row.message) || null,
    metadata: (sanitizeMetadataValue(row.metadata ?? {}) as Record<string, unknown>) ?? {},
  }));
}

export async function countAdminAuthEventLogs() {
  const supabase = createAdminClient();
  const [{count: total}, {count: successCount}] = await Promise.all([
    supabase.from(AUTH_EVENT_LOGS_TABLE).select("*", {count: "exact", head: true}),
    supabase.from(AUTH_EVENT_LOGS_TABLE).select("*", {count: "exact", head: true}).eq("success", true),
  ]);

  return {
    total: total ?? 0,
    success: successCount ?? 0,
  };
}
