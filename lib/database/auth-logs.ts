import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import {sanitizeSensitiveText} from "@/lib/security/sanitize-sensitive-text";
import type {AuthEventLogRow} from "@/lib/types";

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
      metadata: (sanitizeMetadataValue(input.metadata ?? {}) as Record<string, unknown>) ?? {},
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
