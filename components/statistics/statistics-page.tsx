import Link from "next/link";
import {ArrowLeft, Shield} from "lucide-react";

import {CornerPlus} from "@/components/corner-plus";
import {SiteFooter} from "@/components/home/site-footer";
import {StatisticsOverviewGrid} from "@/components/statistics/statistics-overview-grid";
import {StatisticsTrendPanel} from "@/components/statistics/statistics-trend-panel";
import {ThemeToggle} from "@/components/theme-toggle";
import type {StatisticsDashboardData} from "@/lib/database/statistics";
import type {StatisticsCardRow} from "@/lib/types";

interface StatisticsPageProps {
  data: StatisticsDashboardData;
  cards: StatisticsCardRow[];
}

export function StatisticsPage({data, cards}: StatisticsPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f6f2] py-4 text-foreground sm:py-6 dark:bg-[#08090b] dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(255,255,255,0.95),transparent_22%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.55),transparent_18%),linear-gradient(180deg,#f8f8f4_0%,#efefea_100%)] dark:bg-[radial-gradient(circle_at_14%_10%,rgba(255,255,255,0.1),transparent_20%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.07),transparent_18%),linear-gradient(180deg,#08090b_0%,#0a0b0e_100%)]" />
        <div className="absolute left-[10%] top-[12%] h-[280px] w-[280px] rounded-full bg-black/[0.04] blur-[130px] dark:bg-white/6" />
        <div className="absolute bottom-[8%] right-[12%] h-[320px] w-[320px] rounded-full bg-black/[0.03] blur-[150px] dark:bg-white/5" />
      </div>

      <CornerPlus className="fixed left-4 top-4 h-6 w-6 text-border md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 text-border md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 text-border md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 text-border md:bottom-8 md:right-8" />

      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 md:right-8 md:top-8">
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          <Shield className="mr-2 h-4 w-4" />
          Admin
        </Link>
        <ThemeToggle />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1480px] flex-col px-4 pb-24 sm:px-6 lg:px-8">
        <section className="flex-1 border-b border-black/8 pb-14 pt-2 dark:border-white/8 lg:pb-20">
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <Link
                href="/"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-black/8 bg-white/65 px-4 text-sm font-medium text-foreground/76 transition-colors hover:bg-white/85 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-white/76 dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back Home
              </Link>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-foreground/44 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/44">
                  Statistics Surface
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/55 dark:bg-white/55" />
                  Request Usage
                </div>
                <h1 className="text-4xl font-black leading-none tracking-[-0.06em] text-foreground dark:text-white sm:text-5xl md:text-6xl">
                  今天
                </h1>
                <p className="max-w-[42rem] text-sm leading-7 text-muted-foreground dark:text-white/50 sm:text-base">
                  当前先以数据库占位结构承接统计面板，后续再由 Go 后端写入真实的请求、模型和账号池数据。
                </p>
              </div>
            </div>
          </div>

          <StatisticsTrendPanel
            brandUsage={data.brandUsage}
            requestTrends={data.requestTrends}
            updatedAt={data.updatedAt}
          />

          <section className="mt-10">
            <h2 className="border-b border-black/8 pb-3 text-[2rem] font-black tracking-[-0.05em] text-foreground dark:border-white/8 dark:text-white">
              概况
            </h2>
            <StatisticsOverviewGrid
              accountPools={data.accountPools}
              cards={cards}
              dailyUsage={data.dailyUsage}
              hourlyUsage={data.hourlyUsage}
              modelRankings={data.modelRankings}
              overview={data.overview}
              totalRequests={data.totalRequests}
              updatedAt={data.updatedAt}
            />
          </section>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
