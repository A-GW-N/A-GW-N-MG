"use client";

import {useMemo, useState} from "react";
import {Anthropic, Claude, Gemini, OpenAI} from "@lobehub/icons";

import type {StatisticsBrandUsageRow, StatisticsRequestTrendRow} from "@/lib/types";
import {LiveUpdateTime} from "@/components/statistics/live-update-time";

const REQUEST_TREND_BUCKET_MINUTES = 2;
const REQUEST_TREND_SCALE_PER_MINUTE = 150;
const REQUEST_TREND_SCALE_MAX = REQUEST_TREND_BUCKET_MINUTES * REQUEST_TREND_SCALE_PER_MINUTE;
const CURVE_SMOOTHING_FACTOR = 0.22;
const brandColorMap: Record<string, string> = {
  gpt: "#111111",
  gemini: "#4b83ff",
  claude: "#8a5b38",
  anthropic: "#8a5b38",
  other: "#2fd885",
};

function buildSeriesPoints(values: number[], scaleMax: number, width: number, height: number, padding: number) {
  return values.map((value, index) => ({
    x: padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2),
    y: getYPosition(value, scaleMax, height, padding),
  }));
}

function buildSmoothPath(points: Array<{x: number; y: number}>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) * CURVE_SMOOTHING_FACTOR;
    const cp1y = p1.y + (p2.y - p0.y) * CURVE_SMOOTHING_FACTOR;
    const cp2x = p2.x - (p3.x - p1.x) * CURVE_SMOOTHING_FACTOR;
    const cp2y = p2.y - (p3.y - p1.y) * CURVE_SMOOTHING_FACTOR;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

function formatHourLabel(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatShortHour(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getYPosition(value: number, scaleMax: number, height: number, padding: number) {
  const safeValue = Math.min(Math.max(value, 0), Math.max(scaleMax, 1));
  return height - padding - (safeValue / Math.max(scaleMax, 1)) * (height - padding * 2);
}

function getBrandColor(brand: string, index: number) {
  const lowered = brand.trim().toLowerCase();
  if (brandColorMap[lowered]) {
    return brandColorMap[lowered];
  }

  const palette = ["#f59e0b", "#a855f7", "#14b8a6", "#ef4444", "#0ea5e9", "#22c55e"];
  return palette[index % palette.length];
}

function renderBrandIcon(brand: string) {
  const normalized = brand.trim().toLowerCase();

  switch (normalized) {
    case "gpt":
    case "openai":
      return <OpenAI.Avatar shape="circle" size={24} />;
    case "gemini":
      return <Gemini.Avatar shape="circle" size={24} />;
    case "claude":
      return <Claude.Avatar shape="circle" size={24} />;
    case "anthropic":
      return <Anthropic.Avatar shape="circle" size={24} />;
    default:
      return null;
  }
}

interface StatisticsTrendPanelProps {
  brandUsage: StatisticsBrandUsageRow[];
  requestTrends: StatisticsRequestTrendRow[];
  updatedAt?: string;
}

export function StatisticsTrendPanel({
  brandUsage,
  requestTrends,
  updatedAt,
}: StatisticsTrendPanelProps) {
  const width = 860;
  const height = 320;
  const padding = 24;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const visibleBrandUsage = useMemo(
    () =>
      [...brandUsage]
        .filter((item) => item.usage_count > 0)
        .sort((a, b) => a.sort_order - b.sort_order || b.usage_count - a.usage_count),
    [brandUsage]
  );

  const successValues = requestTrends.map((item) => item.success_count);
  const failedValues = requestTrends.map((item) => item.failed_count);
  const trendScaleMax = REQUEST_TREND_SCALE_MAX;
  const successPoints = buildSeriesPoints(successValues, trendScaleMax, width, height, padding);
  const failedPoints = buildSeriesPoints(failedValues, trendScaleMax, width, height, padding);

  const activePoint = activeIndex === null ? null : (requestTrends[activeIndex] ?? null);
  const activeX =
    activeIndex === null
      ? null
      : padding + (activeIndex / Math.max(requestTrends.length - 1, 1)) * (width - padding * 2);
  const activeSuccessY =
    activePoint === null ? null : getYPosition(activePoint.success_count, trendScaleMax, height, padding);
  const activeFailedY =
    activePoint === null ? null : getYPosition(activePoint.failed_count, trendScaleMax, height, padding);
  const hoverColumnWidth = (width - padding * 2) / Math.max(requestTrends.length, 1);
  const axisStep = 120;
  const axisIndexes = requestTrends.reduce<number[]>((result, _, index) => {
    if (index % axisStep === 0 || index === requestTrends.length - 1) {
      result.push(index);
    }
    return result;
  }, []);

  return (
    <section className="grid gap-6 border-b border-black/8 pb-10 dark:border-white/8 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.7fr)]">
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground/82 dark:text-white/82">
          24 小时请求趋势 / 每 2 分钟
        </h2>

        <article className="relative overflow-hidden rounded-[1.9rem] border border-black/8 bg-[#f6f6f2]/94 p-4 shadow-[0_28px_90px_rgba(15,15,15,0.1)] dark:border-white/10 dark:bg-[#101114]/94 dark:shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:p-5">
          <div className="absolute inset-[1px] rounded-[calc(1.9rem-1px)] border border-black/6 dark:border-white/6" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03),transparent_32%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_32%)]" />

          <div className="relative" onMouseLeave={() => setActiveIndex(null)}>
            {activePoint && activeX !== null ? (
              <div
                className="pointer-events-none absolute top-4 z-10 w-[158px] rounded-[1rem] border border-black/8 bg-white/92 px-4 py-3 shadow-[0_18px_52px_rgba(15,15,15,0.12)] dark:border-white/8 dark:bg-[#0e0f12]/95 dark:shadow-[0_18px_52px_rgba(0,0,0,0.28)]"
                style={{
                  left: `clamp(0px, calc(${((activeX / width) * 100).toFixed(3)}% - 79px), calc(100% - 158px))`,
                }}
              >
                <p className="text-[1.05rem] font-semibold text-foreground/88 dark:text-white/88">
                  {formatHourLabel(activePoint.bucket_at)}
                </p>
                <div className="mt-3 space-y-2.5 text-sm text-muted-foreground dark:text-white/68">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-[4px] bg-[#29d982]" />
                      <span>成功</span>
                    </div>
                    <span className="font-medium text-foreground/90 dark:text-white/90">
                      {activePoint.success_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-[4px] bg-[#ff6179]" />
                      <span>失败</span>
                    </div>
                    <span className="font-medium text-foreground/90 dark:text-white/90">
                      {activePoint.failed_count}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <svg viewBox={`0 0 ${width} ${height + 28}`} className="h-[260px] w-full sm:h-[320px]">
              {Array.from({length: 5}, (_, index) => {
                const y = padding + (index / 4) * (height - padding * 2);
                return (
                  <line
                    key={`grid-y-${index}`}
                    x1={padding}
                    x2={width - padding}
                    y1={y}
                    y2={y}
                    stroke="rgba(120,120,120,0.10)"
                    strokeDasharray="4 10"
                  />
                );
              })}

              {requestTrends.map((item, index) => {
                if (index % 10 !== 0) {
                  return null;
                }

                const x = padding + (index / Math.max(requestTrends.length - 1, 1)) * (width - padding * 2);
                return (
                  <line
                    key={`${item.id}-grid-x`}
                    x1={x}
                    x2={x}
                    y1={padding}
                    y2={height - padding}
                    stroke="rgba(120,120,120,0.07)"
                    strokeDasharray="3 10"
                  />
                );
              })}
              <path
                d={buildSmoothPath(successPoints)}
                fill="none"
                stroke="#29d982"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={buildSmoothPath(failedPoints)}
                fill="none"
                stroke="#ff6179"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 7"
              />

              {requestTrends.map((item, index) => {
                const x = padding + (index / Math.max(requestTrends.length - 1, 1)) * (width - padding * 2);
                const successY = getYPosition(item.success_count, trendScaleMax, height, padding);
                const failedY = getYPosition(item.failed_count, trendScaleMax, height, padding);
                const isActive = index === activeIndex;

                return (
                  <g key={item.id}>
                    <circle cx={x} cy={successY} r={isActive ? 4.4 : 1.55} fill="#29d982" opacity={item.success_count > 0 ? 0.96 : 0.22} />
                    <circle cx={x} cy={failedY} r={isActive ? 4.1 : 1.45} fill="#ff6179" opacity={item.failed_count > 0 ? 0.94 : 0.2} />
                  </g>
                );
              })}

              {activePoint && activeX !== null && activeSuccessY !== null && activeFailedY !== null ? (
                <>
                  <line
                    x1={activeX}
                    x2={activeX}
                    y1={padding}
                    y2={height - padding}
                    stroke="rgba(120,120,120,0.22)"
                    strokeDasharray="6 8"
                  />
                  <circle cx={activeX} cy={activeSuccessY} r="6" fill="#29d982" stroke="currentColor" strokeWidth="2" />
                  <circle cx={activeX} cy={activeFailedY} r="6" fill="#ff6179" stroke="currentColor" strokeWidth="2" />
                </>
              ) : null}

              {requestTrends.map((item, index) => {
                const x = padding + (index / Math.max(requestTrends.length - 1, 1)) * (width - padding * 2);
                return (
                  <rect
                    key={`${item.id}-hover`}
                    x={Math.max(padding, x - hoverColumnWidth / 2)}
                    y={padding}
                    width={hoverColumnWidth}
                    height={height - padding * 2}
                    fill="transparent"
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                );
              })}

              {axisIndexes.map((realIndex) => {
                const item = requestTrends[realIndex];
                if (!item) {
                  return null;
                }

                const x =
                  padding + (realIndex / Math.max(requestTrends.length - 1, 1)) * (width - padding * 2);

                return (
                  <text
                    key={`${item.id}-axis`}
                    x={x}
                    y={height + 20}
                    textAnchor={realIndex === requestTrends.length - 1 ? "end" : "middle"}
                    fill="rgba(120,120,120,0.48)"
                    fontSize="12"
                  >
                    {formatShortHour(item.bucket_at)}
                  </text>
                );
              })}
            </svg>
          </div>
        </article>
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground/82 dark:text-white/82">总模型调用</h2>

        <article className="relative overflow-hidden rounded-[1.9rem] border border-black/8 bg-[#f6f6f2]/94 shadow-[0_28px_90px_rgba(15,15,15,0.1)] dark:border-white/10 dark:bg-[#101114]/94 dark:shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
          <div className="absolute inset-[1px] rounded-[calc(1.9rem-1px)] border border-black/6 dark:border-white/6" />
          <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.12),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />

          <div className="relative flex h-[352px] flex-col">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h3 className="text-base font-semibold text-foreground dark:text-white">模型品牌分布</h3>
            </div>

            <div className="border-t border-black/6 px-5 py-5 dark:border-white/6">
              {visibleBrandUsage.length === 0 ? (
                <div className="flex h-[248px] items-center justify-center text-sm text-muted-foreground dark:text-white/34">
                  暂无品牌调用数据
                </div>
              ) : (
                <div className="relative h-[248px] overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-[linear-gradient(180deg,rgba(246,246,242,0.92),rgba(246,246,242,0))] dark:bg-[linear-gradient(180deg,rgba(16,17,20,0.92),rgba(16,17,20,0))]" />
                  <div className="relative z-0 h-full overflow-y-auto overscroll-contain pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="space-y-4 pt-3 pb-4">
                      {visibleBrandUsage.map((item, index) => {
                        const brandColor = getBrandColor(item.brand, index);
                        const iconNode = renderBrandIcon(item.brand);

                        return (
                          <div
                            key={`${item.brand}-${index}`}
                            className="flex items-center justify-between gap-4 rounded-[1rem] border border-black/8 bg-black/[0.03] px-4 py-3 dark:border-white/8 dark:bg-black/20"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/8 bg-white/72 shadow-[0_8px_18px_rgba(15,15,15,0.08)] dark:border-white/10 dark:bg-white/8"
                                style={!iconNode ? {backgroundColor: brandColor} : undefined}
                              >
                                {iconNode ?? <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <span className="shrink-0 text-right text-sm font-semibold text-foreground dark:text-white">
                              {item.usage_count.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-[linear-gradient(0deg,rgba(246,246,242,0.96),rgba(246,246,242,0))] dark:bg-[linear-gradient(0deg,rgba(16,17,20,0.96),rgba(16,17,20,0))]" />
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-black/6 px-5 py-3 text-xs text-muted-foreground dark:border-white/6 dark:text-white/34">
              <LiveUpdateTime initialValue={updatedAt} />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
