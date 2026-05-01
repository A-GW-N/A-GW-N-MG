import type {
  StatisticsAccountPoolRow,
  StatisticsCardRow,
  StatisticsDailyUsageRow,
  StatisticsHourlyUsageRow,
  StatisticsModelRankingRow,
  StatisticsOverviewRow,
} from "@/lib/types";
import {LiveUpdateTime} from "@/components/statistics/live-update-time";

const scrollPanelClassName =
  "h-full overflow-y-auto overscroll-contain pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
const USAGE_PROGRESS_THRESHOLDS = [1_000_000, 10_000_000, 50_000_000, 100_000_000, 500_000_000] as const;

function formatCompactNumber(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

function resolveUsageScale(value: number) {
  for (const threshold of USAGE_PROGRESS_THRESHOLDS) {
    if (value <= threshold) {
      return threshold;
    }
  }

  return USAGE_PROGRESS_THRESHOLDS[USAGE_PROGRESS_THRESHOLDS.length - 1];
}

function getFixedRatioWidth(value: number, limit: number) {
  if (value <= 0) {
    return 0;
  }

  return Math.min(100, (value / limit) * 100);
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
  });
}

function formatHourLabel(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function OverviewCardShell({
  title,
  titleExtra,
  children,
  updatedAt,
}: {
  title: string;
  titleExtra?: string;
  children: React.ReactNode;
  updatedAt?: string;
}) {
  return (
    <article className="overflow-hidden rounded-[1.55rem] border border-black/8 bg-[#f6f6f2] shadow-[0_18px_52px_rgba(15,15,15,0.08)] dark:border-white/8 dark:bg-[#111215] dark:shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground dark:text-white">{title}</h3>
          {titleExtra ? <span className="text-xl font-black text-foreground dark:text-white">{titleExtra}</span> : null}
        </div>
      </div>

      <div className="border-t border-black/6 px-5 py-5 dark:border-white/6">{children}</div>

      <div className="border-t border-black/6 px-5 py-3 text-xs text-muted-foreground dark:border-white/6 dark:text-white/34">
        <LiveUpdateTime initialValue={updatedAt} />
      </div>
    </article>
  );
}

function ScrollPanel({children}: {children: React.ReactNode}) {
  return (
    <div className="relative h-[220px] overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-[linear-gradient(180deg,rgba(246,246,242,0.92),rgba(246,246,242,0))] dark:bg-[linear-gradient(180deg,rgba(17,18,21,0.68),rgba(17,18,21,0))]" />
      <div className={`relative z-0 ${scrollPanelClassName}`}>
        <div className="pt-3 pb-4">{children}</div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-[linear-gradient(0deg,rgba(246,246,242,0.96),rgba(246,246,242,0))] dark:bg-[linear-gradient(0deg,rgba(17,18,21,0.72),rgba(17,18,21,0))]" />
    </div>
  );
}

function UsageList({
  rows,
  type,
}: {
  rows: Array<{label: string; value: number}>;
  type: "daily" | "hourly";
}) {
  return (
    <div className="grid h-full content-start gap-2.5">
      {rows.map((row) => (
        <div key={`${type}-${row.label}`} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/42 dark:text-white/38">{row.label}</span>
            <span className="text-foreground/74 dark:text-white/74">{formatCompactNumber(row.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.06]">
            {row.value > 0 ? (
              <div
                className={
                  type === "daily"
                    ? "h-full rounded-full bg-black dark:bg-[#f2f2f2]"
                    : "h-full rounded-full bg-[#4b83ff]"
                }
                style={{width: `${getFixedRatioWidth(row.value, resolveUsageScale(row.value))}%`}}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingList({rows}: {rows: StatisticsModelRankingRow[]}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground dark:text-white/34">
        暂无模型用量排行数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.id} className="rounded-[1rem] border border-black/8 bg-black/[0.03] px-4 py-3 dark:border-white/8 dark:bg-black/20">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-xs font-semibold text-foreground/34 dark:text-white/34">#{index + 1}</span>
              <span className="truncate text-foreground/76 dark:text-white/76">{row.model_name}</span>
            </div>
            <span className="text-foreground/82 dark:text-white/82">{formatCompactNumber(row.usage_total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountPoolList({rows}: {rows: StatisticsAccountPoolRow[]}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground dark:text-white/34">
        暂无账号池数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-[1rem] border border-black/8 bg-black/[0.03] px-4 py-3 dark:border-white/8 dark:bg-black/20">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground dark:text-white">{row.pool_name}</p>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground dark:text-white/58">
            <span>账号数</span>
            <span className="font-semibold text-foreground dark:text-white">
              {row.total_accounts}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatisticsOverviewGridProps {
  accountPools: StatisticsAccountPoolRow[];
  cards: StatisticsCardRow[];
  dailyUsage: StatisticsDailyUsageRow[];
  hourlyUsage: StatisticsHourlyUsageRow[];
  modelRankings: StatisticsModelRankingRow[];
  overview: StatisticsOverviewRow;
  totalRequests: number;
  updatedAt?: string;
}

export function StatisticsOverviewGrid({
  accountPools,
  cards,
  dailyUsage,
  hourlyUsage,
  modelRankings,
  overview,
  totalRequests,
  updatedAt,
}: StatisticsOverviewGridProps) {
  const dailyRows = [...dailyUsage]
    .reverse()
    .map((row) => ({
      label: formatDateLabel(row.bucket_date),
      value: row.usage_total,
    }));
  const hourlyRows = [...hourlyUsage]
    .reverse()
    .map((row) => ({
      label: formatHourLabel(row.bucket_hour),
      value: row.usage_total,
    }));
  const enabledCards = cards.filter((card) => card.is_enabled).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mt-4 rounded-[1.7rem] border border-black/8 bg-white/35 p-2 dark:border-white/8 dark:bg-white/[0.025]">
      <div className="grid gap-2 lg:grid-cols-3">
        {enabledCards.map((card) => {
          switch (card.card_type) {
            case "total_usage":
              return (
                <OverviewCardShell key={card.card_key} title={card.title} updatedAt={updatedAt}>
                  <div className="flex h-[220px] flex-col justify-between">
                    <div>
                      <p className="text-[2.3rem] font-black tracking-[-0.05em] text-foreground dark:text-white">
                        {formatCompactNumber(totalRequests)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-foreground/34 dark:text-white/34">
                        Total Requests
                      </p>
                      <div className="mt-6 rounded-[1.2rem] border border-black/8 bg-black/[0.03] px-4 py-4 dark:border-white/8 dark:bg-black/20">
                        <p className="text-xs uppercase tracking-[0.2em] text-foreground/34 dark:text-white/34">Token Total</p>
                        <p className="mt-3 text-[1.65rem] font-black tracking-[-0.04em] text-foreground dark:text-white">
                          {formatCompactNumber(overview.total_usage)}
                        </p>
                      </div>
                      <p className="mt-4 max-w-[18rem] text-sm leading-7 text-muted-foreground dark:text-white/42">
                        {card.description || "累计请求数与 token 使用总量。"}
                      </p>
                    </div>
                  </div>
                </OverviewCardShell>
              );
            case "rpm_tpm":
              return (
                <OverviewCardShell key={card.card_key} title={card.title} updatedAt={updatedAt}>
                  <div className="flex h-[220px] flex-col justify-between">
                    <div className="grid gap-4">
                      <div className="rounded-[1.2rem] border border-black/8 bg-black/[0.03] px-4 py-4 dark:border-white/8 dark:bg-black/20">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/34 dark:text-white/34">RPM</p>
                        <p className="mt-3 text-[2rem] font-black tracking-[-0.04em] text-foreground dark:text-white">{overview.rpm}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-black/8 bg-black/[0.03] px-4 py-4 dark:border-white/8 dark:bg-black/20">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/34 dark:text-white/34">TPM</p>
                        <p className="mt-3 text-[2rem] font-black tracking-[-0.04em] text-foreground dark:text-white">
                          {formatCompactNumber(overview.tpm)}
                        </p>
                      </div>
                    </div>
                  </div>
                </OverviewCardShell>
              );
            case "daily_usage":
              return (
                <OverviewCardShell key={card.card_key} title={card.title} updatedAt={updatedAt}>
                  <ScrollPanel>
                    <UsageList rows={dailyRows} type="daily" />
                  </ScrollPanel>
                </OverviewCardShell>
              );
            case "hourly_usage":
              return (
                <OverviewCardShell key={card.card_key} title={card.title} updatedAt={updatedAt}>
                  <ScrollPanel>
                    <UsageList rows={hourlyRows} type="hourly" />
                  </ScrollPanel>
                </OverviewCardShell>
              );
            case "model_rankings":
              return (
                <OverviewCardShell key={card.card_key} title={card.title} updatedAt={updatedAt}>
                  <ScrollPanel>
                    <RankingList rows={modelRankings} />
                  </ScrollPanel>
                </OverviewCardShell>
              );
            case "account_pools":
              return (
                <OverviewCardShell key={card.card_key} title={card.title} updatedAt={updatedAt}>
                  <ScrollPanel>
                    <AccountPoolList rows={accountPools} />
                  </ScrollPanel>
                </OverviewCardShell>
              );
            default:
              return (
                <OverviewCardShell key={card.card_key} title={card.title} updatedAt={updatedAt}>
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground dark:text-white/34">
                    {card.description || "当前卡片类型尚未绑定具体数据。"}
                  </div>
                </OverviewCardShell>
              );
          }
        })}
      </div>
    </div>
  );
}
