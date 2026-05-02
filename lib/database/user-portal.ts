import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import type {GatewayRequestLogRow} from "@/lib/types";

import {loadUserGatewayApiKey, type GatewayApiKeySummary} from "@/lib/database/gateway-api-keys";

const GATEWAY_REQUEST_LOGS_TABLE = "gateway_request_logs";
const USER_USAGE_SUMMARY_VIEW = "gateway_user_usage_summary";
const USER_MODEL_USAGE_VIEW = "gateway_user_model_usage";
const RATE_WINDOW_MS = 60 * 1000;

export interface UserUsageSummaryRow {
  user_id: string;
  request_count: number;
  success_count: number;
  failed_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  rpm_count: number;
  tpm_count: number;
  last_request_at?: string | null;
}

export interface UserModelUsageRow {
  user_id: string;
  model_name: string;
  brand: string;
  request_count: number;
  total_tokens: number;
  last_used_at?: string | null;
}

export interface UserRecentLogItem {
  id: string;
  request_id: string;
  external_model: string;
  mapped_model: string;
  brand: string;
  success: boolean;
  status_code?: number | null;
  latency_ms?: number | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  error_message?: string | null;
  created_at: string;
}

export interface UserPortalData {
  ownedKey: GatewayApiKeySummary | null;
  usage: UserUsageSummaryRow;
  models: UserModelUsageRow[];
  logs: UserRecentLogItem[];
}

function isMissingRelation(error: {code?: string; message?: string} | null | undefined, relation: string) {
  return error?.code === "PGRST205" || error?.message?.includes(relation);
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function emptyUsage(userId: string): UserUsageSummaryRow {
  return {
    user_id: userId,
    request_count: 0,
    success_count: 0,
    failed_count: 0,
    total_tokens: 0,
    input_tokens: 0,
    output_tokens: 0,
    rpm_count: 0,
    tpm_count: 0,
    last_request_at: null,
  };
}

function normalizeLogs(rows: GatewayRequestLogRow[]) {
  return rows.map((row) => ({
    id: row.id,
    request_id: row.request_id,
    external_model: row.external_model,
    mapped_model: row.mapped_model,
    brand: row.brand,
    success: row.success,
    status_code: row.status_code ?? null,
    latency_ms: row.latency_ms ?? null,
    input_tokens: toNumber(row.input_tokens),
    output_tokens: toNumber(row.output_tokens),
    total_tokens: toNumber(row.total_tokens) || toNumber(row.input_tokens) + toNumber(row.output_tokens),
    error_message: row.error_message ?? null,
    created_at: row.created_at ?? new Date(0).toISOString(),
  }));
}

async function loadFallbackUsage(userId: string) {
  const supabase = createAdminClient();
  const {data, error, count} = await supabase
    .from(GATEWAY_REQUEST_LOGS_TABLE)
    .select("id, success, total_tokens, input_tokens, output_tokens, rpm_count, tpm_count, mapped_model, external_model, brand, created_at", {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("created_at", {ascending: false})
    .limit(5000);

  if (error) {
    console.error("Failed to load fallback user portal data:", error);
    return {
      usage: emptyUsage(userId),
      models: [] as UserModelUsageRow[],
    };
  }

  const rows = (data as GatewayRequestLogRow[] | null) ?? [];
  const modelMap = new Map<string, UserModelUsageRow>();
  const rateWindowStart = new Date(Date.now() - RATE_WINDOW_MS);

  const usage = rows.reduce<UserUsageSummaryRow>(
    (accumulator, row) => {
      const totalTokens =
        toNumber(row.total_tokens) || toNumber(row.input_tokens) + toNumber(row.output_tokens);
      const createdAt = row.created_at ? new Date(row.created_at) : null;
      const isInRateWindow = createdAt !== null && !Number.isNaN(createdAt.getTime()) && createdAt >= rateWindowStart;

      accumulator.success_count += row.success ? 1 : 0;
      accumulator.failed_count += row.success ? 0 : 1;
      accumulator.total_tokens += totalTokens;
      accumulator.input_tokens += toNumber(row.input_tokens);
      accumulator.output_tokens += toNumber(row.output_tokens);
      if (isInRateWindow) {
        accumulator.rpm_count += 1;
        accumulator.tpm_count += totalTokens;
      }
      accumulator.last_request_at ||= row.created_at ?? null;

      const modelName = row.mapped_model?.trim() || row.external_model?.trim() || "unknown";
      const existingModel = modelMap.get(modelName) ?? {
        user_id: userId,
        model_name: modelName,
        brand: row.brand?.trim() || "other",
        request_count: 0,
        total_tokens: 0,
        last_used_at: row.created_at ?? null,
      };

      existingModel.request_count += 1;
      existingModel.total_tokens += totalTokens;
      if (!existingModel.last_used_at && row.created_at) {
        existingModel.last_used_at = row.created_at;
      }

      modelMap.set(modelName, existingModel);
      return accumulator;
    },
    {
      ...emptyUsage(userId),
      request_count: count ?? rows.length,
    }
  );

  return {
    usage,
    models: [...modelMap.values()].sort(
      (a, b) => b.request_count - a.request_count || b.total_tokens - a.total_tokens
    ),
  };
}

async function loadUserRateUsage(userId: string) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const {data, error, count} = await supabase
    .from(GATEWAY_REQUEST_LOGS_TABLE)
    .select("id, total_tokens, input_tokens, output_tokens", {count: "exact"})
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    if (!isMissingRelation(error, GATEWAY_REQUEST_LOGS_TABLE)) {
      console.error("Failed to load user RPM/TPM:", error);
    }
    return {rpm_count: 0, tpm_count: 0};
  }

  const rows = (data as GatewayRequestLogRow[] | null) ?? [];
  return {
    rpm_count: count ?? rows.length,
    tpm_count: rows.reduce((sum, row) => (
      sum + (toNumber(row.total_tokens) || toNumber(row.input_tokens) + toNumber(row.output_tokens))
    ), 0),
  };
}

export async function loadUserPortalData(userId: string): Promise<UserPortalData> {
  const supabase = createAdminClient();
  const ownedKeyPromise = loadUserGatewayApiKey(userId);
  const [usageResult, modelResult, logResult, rateUsage, ownedKey] = await Promise.all([
    supabase.from(USER_USAGE_SUMMARY_VIEW).select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from(USER_MODEL_USAGE_VIEW)
      .select("*")
      .eq("user_id", userId)
      .order("request_count", {ascending: false})
      .order("total_tokens", {ascending: false})
      .limit(12),
    supabase
      .from(GATEWAY_REQUEST_LOGS_TABLE)
      .select("id, request_id, external_model, mapped_model, brand, success, status_code, latency_ms, input_tokens, output_tokens, total_tokens, error_message, created_at")
      .eq("user_id", userId)
      .order("created_at", {ascending: false})
      .limit(20),
    loadUserRateUsage(userId),
    ownedKeyPromise,
  ]);

  const logs = normalizeLogs((logResult.data as GatewayRequestLogRow[] | null) ?? []);

  const missingViews =
    isMissingRelation(usageResult.error, USER_USAGE_SUMMARY_VIEW) ||
    isMissingRelation(modelResult.error, USER_MODEL_USAGE_VIEW);

  if (missingViews) {
    const fallback = await loadFallbackUsage(userId);
    return {
      ownedKey,
      usage: fallback.usage,
      models: fallback.models.slice(0, 12),
      logs,
    };
  }

  if (usageResult.error) {
    console.error("Failed to load user usage summary:", usageResult.error);
  }

  if (modelResult.error) {
    console.error("Failed to load user model usage:", modelResult.error);
  }

  return {
    ownedKey,
    usage: {
      ...((usageResult.data as UserUsageSummaryRow | null) ?? emptyUsage(userId)),
      rpm_count: rateUsage.rpm_count,
      tpm_count: rateUsage.tpm_count,
    },
    models: (modelResult.data as UserModelUsageRow[] | null) ?? [],
    logs,
  };
}
