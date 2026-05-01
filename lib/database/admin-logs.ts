import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import {sanitizeSensitiveText} from "@/lib/security/sanitize-sensitive-text";
import type {GatewayRequestLogRow, UserAccountRow} from "@/lib/types";

const GATEWAY_REQUEST_LOGS_TABLE = "gateway_request_logs";

export interface AdminGatewayRequestLog extends GatewayRequestLogRow {
  user?: Pick<UserAccountRow, "id" | "username" | "display_name" | "role"> | null;
  metadata: Record<string, unknown>;
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

function normalizeLog(row: GatewayRequestLogRow & {
  user_accounts?: Pick<UserAccountRow, "id" | "username" | "display_name" | "role"> | null;
}): AdminGatewayRequestLog {
  return {
    ...row,
    error_message: sanitizeSensitiveText(row.error_message ?? null) || null,
    metadata: (sanitizeMetadataValue(row.metadata ?? {}) as Record<string, unknown>) ?? {},
    user: row.user_accounts ?? null,
  };
}

export async function loadAdminGatewayRequestLogs(limit = 200): Promise<AdminGatewayRequestLog[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(GATEWAY_REQUEST_LOGS_TABLE)
    .select(
      "*, user_accounts(id, username, display_name, role)"
    )
    .order("created_at", {ascending: false})
    .limit(limit);

  if (error) {
    console.error("Failed to load admin gateway request logs:", error);
    return [];
  }

  return (((data as Array<
    GatewayRequestLogRow & {
      user_accounts?: Pick<UserAccountRow, "id" | "username" | "display_name" | "role"> | null;
    }
  > | null) ?? [])).map(normalizeLog);
}

export async function countAdminGatewayRequestLogs() {
  const supabase = createAdminClient();
  const [{count: total}, {count: successCount}] = await Promise.all([
    supabase.from(GATEWAY_REQUEST_LOGS_TABLE).select("*", {count: "exact", head: true}),
    supabase.from(GATEWAY_REQUEST_LOGS_TABLE).select("*", {count: "exact", head: true}).eq("success", true),
  ]);

  return {
    total: total ?? 0,
    success: successCount ?? 0,
  };
}
