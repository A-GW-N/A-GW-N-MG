import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import type {
  AccountPoolRegistryRow,
  GatewayRequestLogRow,
  StatisticsAccountPoolRow,
  StatisticsBrandUsageRow,
  StatisticsDailyUsageRow,
  StatisticsHourlyUsageRow,
  StatisticsModelRankingRow,
  StatisticsOverviewRow,
  StatisticsRequestTrendRow,
} from "@/lib/types";

const GATEWAY_REQUEST_LOGS_TABLE = "gateway_request_logs";
const ACCOUNT_POOL_REGISTRY_TABLE = "account_pool_registry";
const OVERVIEW_TABLE = "statistics_overview";
const REQUEST_TRENDS_TABLE = "statistics_request_trends";
const BRAND_USAGE_TABLE = "statistics_brand_usage";
const DAILY_USAGE_TABLE = "statistics_daily_usage";
const HOURLY_USAGE_TABLE = "statistics_hourly_usage";
const MODEL_RANKINGS_TABLE = "statistics_model_rankings";
const ACCOUNT_POOLS_TABLE = "statistics_account_pools";

const BRAND_ORDER = ["gpt", "gemini", "claude", "other"] as const;
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const REQUEST_TREND_BUCKET_MINUTES = 2;
const REQUEST_TREND_BUCKET_COUNT = 24 * (60 / REQUEST_TREND_BUCKET_MINUTES);

export interface StatisticsDashboardData {
  overview: StatisticsOverviewRow;
  totalRequests: number;
  requestTrends: StatisticsRequestTrendRow[];
  brandUsage: StatisticsBrandUsageRow[];
  dailyUsage: StatisticsDailyUsageRow[];
  hourlyUsage: StatisticsHourlyUsageRow[];
  modelRankings: StatisticsModelRankingRow[];
  accountPools: StatisticsAccountPoolRow[];
  updatedAt: string;
}

function startOfHour(date: Date) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    0,
    0,
    0
  ) - BEIJING_OFFSET_MS);
}

function startOfTenMinutes(date: Date) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  const roundedMinutes =
    Math.floor(shifted.getUTCMinutes() / REQUEST_TREND_BUCKET_MINUTES) * REQUEST_TREND_BUCKET_MINUTES;

  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    roundedMinutes,
    0,
    0
  ) - BEIJING_OFFSET_MS);
}

function startOfDay(date: Date) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    0,
    0,
    0,
    0
  ) - BEIJING_OFFSET_MS);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDayKey(date: Date) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHourKey(date: Date) {
  return startOfHour(date).toISOString();
}

function formatTenMinuteKey(date: Date) {
  return startOfTenMinutes(date).toISOString();
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeBrand(value: string | null | undefined) {
  const lowered = value?.trim().toLowerCase() ?? "";
  if (!lowered) {
    return "other";
  }
  if (BRAND_ORDER.includes(lowered as (typeof BRAND_ORDER)[number])) {
    return lowered as (typeof BRAND_ORDER)[number];
  }
  if (lowered.includes("gpt")) {
    return "gpt";
  }
  if (lowered.includes("gemini")) {
    return "gemini";
  }
  if (lowered.includes("claude")) {
    return "claude";
  }
  return lowered;
}

function getUsageValue(log: Pick<GatewayRequestLogRow, "total_tokens" | "tpm_count" | "input_tokens" | "output_tokens">) {
  return (
    asNumber(log.total_tokens) ||
    asNumber(log.tpm_count) ||
    asNumber(log.input_tokens) + asNumber(log.output_tokens)
  );
}

function getDefaultStatisticsDashboardData(): StatisticsDashboardData {
  const now = new Date();
  const currentHour = startOfHour(now);
  const currentTrendBucket = startOfTenMinutes(now);
  const currentDay = startOfDay(now);

  return {
    overview: {
      snapshot_key: "main",
      total_usage: 0,
      rpm: 0,
      tpm: 0,
    },
    totalRequests: 0,
    requestTrends: Array.from({length: REQUEST_TREND_BUCKET_COUNT}, (_, index) => {
      const bucketAt = addMinutes(
        currentTrendBucket,
        (index - (REQUEST_TREND_BUCKET_COUNT - 1)) * REQUEST_TREND_BUCKET_MINUTES
      );
      return {
        id: `trend-${index}`,
        bucket_at: bucketAt.toISOString(),
        success_count: 0,
        failed_count: 0,
      };
    }),
    brandUsage: BRAND_ORDER.map((brand, index) => ({
      brand,
      usage_count: 0,
      sort_order: index,
    })),
    dailyUsage: Array.from({length: 7}, (_, index) => ({
      bucket_date: formatDayKey(addDays(currentDay, index - 6)),
      usage_total: 0,
    })),
    hourlyUsage: Array.from({length: 24}, (_, index) => ({
      bucket_hour: addHours(currentHour, index - 23).toISOString(),
      usage_total: 0,
    })),
    modelRankings: [],
    accountPools: [],
    updatedAt: now.toISOString(),
  };
}

function isMissingTableError(error: {code?: string; message?: string} | null | undefined, tableName: string) {
  return error?.code === "PGRST205" || error?.message?.includes(tableName);
}

function isValidPoolTableName(tableName: string) {
  return /^[A-Za-z0-9_-]+$/.test(tableName.trim());
}

async function loadRegisteredPoolRowCounts(
  supabase: ReturnType<typeof createAdminClient>,
  registryRows: AccountPoolRegistryRow[]
) {
  const enabledRows = registryRows.filter((row) => row.is_enabled && row.table_name?.trim());
  const counts = await Promise.all(
    enabledRows.map(async (row) => {
      const tableName = row.table_name.trim();
      if (!isValidPoolTableName(tableName)) {
        return [tableName, 0] as const;
      }

      const {count, error} = await supabase
        .from(tableName)
        .select("*", {count: "exact", head: true});

      if (error) {
        console.error(`Failed to count pool table rows for ${tableName}:`, error);
        return [tableName, 0] as const;
      }

      return [tableName, count ?? 0] as const;
    })
  );

  return new Map<string, number>(counts);
}

async function loadStoredStatisticsDashboard(): Promise<StatisticsDashboardData> {
  const defaults = getDefaultStatisticsDashboardData();
  const supabase = createAdminClient();

  const [overviewResult, requestResult, brandResult, dailyResult, hourlyResult, rankingsResult, poolsResult] =
    await Promise.all([
      supabase.from(OVERVIEW_TABLE).select("*").eq("snapshot_key", "main").maybeSingle(),
      supabase.from(REQUEST_TRENDS_TABLE).select("*").order("bucket_at", {ascending: true}),
      supabase.from(BRAND_USAGE_TABLE).select("*").order("sort_order", {ascending: true}),
      supabase.from(DAILY_USAGE_TABLE).select("*").order("bucket_date", {ascending: true}),
      supabase.from(HOURLY_USAGE_TABLE).select("*").order("bucket_hour", {ascending: true}),
      supabase.from(MODEL_RANKINGS_TABLE).select("*").order("sort_order", {ascending: true}),
      supabase.from(ACCOUNT_POOLS_TABLE).select("*").order("sort_order", {ascending: true}),
    ]);

  const shouldFallback =
    isMissingTableError(overviewResult.error, OVERVIEW_TABLE) ||
    isMissingTableError(requestResult.error, REQUEST_TRENDS_TABLE) ||
    isMissingTableError(brandResult.error, BRAND_USAGE_TABLE) ||
    isMissingTableError(dailyResult.error, DAILY_USAGE_TABLE) ||
    isMissingTableError(hourlyResult.error, HOURLY_USAGE_TABLE) ||
    isMissingTableError(rankingsResult.error, MODEL_RANKINGS_TABLE) ||
    isMissingTableError(poolsResult.error, ACCOUNT_POOLS_TABLE);

  if (shouldFallback) {
    return defaults;
  }

  return {
    overview: (overviewResult.data as StatisticsOverviewRow | null) ?? defaults.overview,
    totalRequests: 0,
    requestTrends:
      ((requestResult.data as StatisticsRequestTrendRow[] | null) ?? []).length > 0
        ? ((requestResult.data as StatisticsRequestTrendRow[] | null) ?? [])
        : defaults.requestTrends,
    brandUsage:
      ((brandResult.data as StatisticsBrandUsageRow[] | null) ?? []).length > 0
        ? ((brandResult.data as StatisticsBrandUsageRow[] | null) ?? [])
        : defaults.brandUsage,
    dailyUsage:
      ((dailyResult.data as StatisticsDailyUsageRow[] | null) ?? []).length > 0
        ? ((dailyResult.data as StatisticsDailyUsageRow[] | null) ?? [])
        : defaults.dailyUsage,
    hourlyUsage:
      ((hourlyResult.data as StatisticsHourlyUsageRow[] | null) ?? []).length > 0
        ? ((hourlyResult.data as StatisticsHourlyUsageRow[] | null) ?? [])
        : defaults.hourlyUsage,
    modelRankings:
      ((rankingsResult.data as StatisticsModelRankingRow[] | null) ?? []).length > 0
        ? ((rankingsResult.data as StatisticsModelRankingRow[] | null) ?? [])
        : defaults.modelRankings,
    accountPools:
      ((poolsResult.data as StatisticsAccountPoolRow[] | null) ?? []).length > 0
        ? ((poolsResult.data as StatisticsAccountPoolRow[] | null) ?? [])
        : defaults.accountPools,
    updatedAt: new Date().toISOString(),
  };
}

async function loadLogDerivedStatisticsDashboard(): Promise<StatisticsDashboardData | null> {
  const supabase = createAdminClient();
  const since = addDays(startOfDay(new Date()), -30).toISOString();

  const [logsResult, poolsResult] = await Promise.all([
    supabase
      .from(GATEWAY_REQUEST_LOGS_TABLE)
      .select(
        "id, success, brand, mapped_model, total_tokens, tpm_count, input_tokens, output_tokens, rpm_count, pool_table_name, pool_record_id, created_at"
      )
      .gte("created_at", since)
      .order("created_at", {ascending: false})
      .limit(5000),
    supabase
      .from(ACCOUNT_POOL_REGISTRY_TABLE)
      .select("*")
      .order("created_at", {ascending: true}),
  ]);

  if (isMissingTableError(logsResult.error, GATEWAY_REQUEST_LOGS_TABLE)) {
    return null;
  }

  if (logsResult.error) {
    console.error("Failed to load gateway request logs for statistics:", logsResult.error);
    return null;
  }

  const logs = ((logsResult.data as GatewayRequestLogRow[] | null) ?? [])
    .filter((row) => row.created_at)
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  const registryRows = ((poolsResult.data as AccountPoolRegistryRow[] | null) ?? []).filter(
    (row) => row.is_enabled
  );
  const poolRowCounts = await loadRegisteredPoolRowCounts(supabase, registryRows);

  if (logs.length === 0 && registryRows.length === 0) {
    return null;
  }

  const defaults = getDefaultStatisticsDashboardData();
  const now = new Date();
  const currentHour = startOfHour(now);
  const currentTrendBucket = startOfTenMinutes(now);
  const currentDay = startOfDay(now);
  const minuteAgo = new Date(now.getTime() - 60 * 1000);

  const trendMap = new Map<string, StatisticsRequestTrendRow>();
  for (let index = 0; index < REQUEST_TREND_BUCKET_COUNT; index += 1) {
    const bucketAt = addMinutes(
      currentTrendBucket,
      (index - (REQUEST_TREND_BUCKET_COUNT - 1)) * REQUEST_TREND_BUCKET_MINUTES
    ).toISOString();
    trendMap.set(bucketAt, {
      id: `trend-${index}`,
      bucket_at: bucketAt,
      success_count: 0,
      failed_count: 0,
    });
  }

  const dailyMap = new Map<string, StatisticsDailyUsageRow>();
  for (let index = 0; index < 7; index += 1) {
    const bucketDate = formatDayKey(addDays(currentDay, index - 6));
    dailyMap.set(bucketDate, {
      bucket_date: bucketDate,
      usage_total: 0,
    });
  }

  const hourlyMap = new Map<string, StatisticsHourlyUsageRow>();
  for (let index = 0; index < 24; index += 1) {
    const bucketHour = addHours(currentHour, index - 23).toISOString();
    hourlyMap.set(bucketHour, {
      bucket_hour: bucketHour,
      usage_total: 0,
    });
  }

  const brandMap = new Map<string, number>(BRAND_ORDER.map((brand) => [brand, 0]));
  const modelMap = new Map<string, {brand: string; usage: number}>();
  const poolLogMap = new Map<string, {allTime: Set<string>; recent: Set<string>; hits: number}>();

  let totalUsage = 0;
  let rpm = 0;
  let tpm = 0;

  for (const log of logs) {
    const createdAt = new Date(log.created_at as string);
    const usageValue = getUsageValue(log);
    const brand = normalizeBrand(log.brand);
    const modelName = (log.mapped_model || "unknown").trim() || "unknown";
    const poolTable = log.pool_table_name?.trim() || "";
    const poolRecord = log.pool_record_id?.trim() || "";

    totalUsage += usageValue;

    if (createdAt >= minuteAgo) {
      rpm += 1;
      tpm += usageValue;
    }

    const trendKey = formatTenMinuteKey(createdAt);
    const trendBucket = trendMap.get(trendKey);
    if (trendBucket) {
      if (log.success) {
        trendBucket.success_count += 1;
      } else {
        trendBucket.failed_count += 1;
      }
    }

    const dayBucket = dailyMap.get(formatDayKey(createdAt));
    if (dayBucket) {
      dayBucket.usage_total += usageValue;
    }

    const hourBucket = hourlyMap.get(formatHourKey(createdAt));
    if (hourBucket) {
      hourBucket.usage_total += usageValue;
    }

    brandMap.set(brand, (brandMap.get(brand) ?? 0) + 1);

    const existingModel = modelMap.get(modelName) ?? {brand, usage: 0};
    existingModel.usage += usageValue;
    existingModel.brand = brand;
    modelMap.set(modelName, existingModel);

    if (poolTable) {
      const state = poolLogMap.get(poolTable) ?? {
        allTime: new Set<string>(),
        recent: new Set<string>(),
        hits: 0,
      };

      state.hits += 1;
      if (poolRecord) {
        state.allTime.add(poolRecord);
        if (createdAt >= addHours(currentHour, -23)) {
          state.recent.add(poolRecord);
        }
      }

      poolLogMap.set(poolTable, state);
    }
  }

  const knownBrandUsage = BRAND_ORDER.map((brand, index) => ({
    brand,
    usage_count: brandMap.get(brand) ?? 0,
    sort_order: index,
  }));
  const customBrands = [...brandMap.entries()]
    .filter(([brand]) => !BRAND_ORDER.includes(brand as (typeof BRAND_ORDER)[number]))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([brand, usageCount], index) => ({
      brand,
      usage_count: usageCount,
      sort_order: BRAND_ORDER.length + index,
    }));
  const brandUsage: StatisticsBrandUsageRow[] = [...knownBrandUsage, ...customBrands];

  const modelRankings: StatisticsModelRankingRow[] = [...modelMap.entries()]
    .sort((a, b) => b[1].usage - a[1].usage)
    .map(([modelName, item], index) => ({
      id: `ranking-${index}-${modelName}`,
      model_name: modelName,
      brand: item.brand,
      usage_total: item.usage,
      sort_order: index,
    }));

  const accountPools: StatisticsAccountPoolRow[] = [...registryRows]
    .map((tableName, index) => {
      const registry = registryRows[index];
      const normalizedTableName = registry.table_name.trim();
      const poolState = poolLogMap.get(normalizedTableName);
      const totalAccounts = poolRowCounts.get(normalizedTableName) ?? poolState?.allTime.size ?? 0;
      const activeAccounts = 0;
      const statusLabel = totalAccounts > 0 ? "Ready" : "Empty";

      return {
        id: registry?.id ?? `pool-${index}-${normalizedTableName}`,
        pool_name: registry?.display_name?.trim() || normalizedTableName,
        total_accounts: totalAccounts,
        active_accounts: activeAccounts,
        status_label: statusLabel,
        sort_order: index,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    overview: {
      snapshot_key: "main",
      total_usage: totalUsage,
      rpm,
      tpm,
    },
    totalRequests: logs.length,
    requestTrends: [...trendMap.values()],
    brandUsage,
    dailyUsage: [...dailyMap.values()],
    hourlyUsage: [...hourlyMap.values()],
    modelRankings: modelRankings.length > 0 ? modelRankings : defaults.modelRankings,
    accountPools,
    updatedAt: now.toISOString(),
  };
}

export async function loadStatisticsDashboard(): Promise<StatisticsDashboardData> {
  const logDerived = await loadLogDerivedStatisticsDashboard();
  if (logDerived) {
    return logDerived;
  }

  return loadStoredStatisticsDashboard();
}
