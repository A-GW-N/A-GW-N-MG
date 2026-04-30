import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft, BarChart3, Database, Layers3} from "lucide-react";

import {AdminLoginPanel} from "@/components/admin/admin-login-panel";
import {AdminLogoutButton} from "@/components/admin/admin-logout-button";
import {ControlCenterManager} from "@/components/admin/control-center-manager";
import {CornerPlus} from "@/components/corner-plus";
import {ThemeToggle} from "@/components/theme-toggle";
import {isAdminAuthenticated, isAdminPasswordConfigured} from "@/lib/admin/auth";
import {loadAccountPoolRegistry, loadGatewayProfiles} from "@/lib/database/gateway-profiles";
import {loadStatisticsCards} from "@/lib/database/statistics-cards";

export const metadata: Metadata = {
  title: "Admin Statistics Management",
  description: "A-GW-N 统计管理页，用于维护中转配置、账号池和统计卡片。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminStatisticsManagementPage() {
  const isProtected = isAdminPasswordConfigured();
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginPanel mode={isProtected ? "password" : "oauth-admin"} />;
  }

  const [profiles, pools, statisticsCards] = await Promise.all([
    loadGatewayProfiles(),
    loadAccountPoolRegistry(),
    loadStatisticsCards(),
  ]);

  return (
    <div className="relative min-h-screen py-4 sm:py-6">
      <CornerPlus className="fixed left-4 top-4 h-6 w-6 text-border md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 text-border md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 text-border md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 text-border md:bottom-8 md:right-8" />

      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 md:right-8 md:top-8">
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back Admin
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          Back Home
        </Link>
        {isProtected && <AdminLogoutButton />}
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1520px] flex-col gap-6 px-3 pb-24 sm:px-4 lg:px-6 xl:px-8">
        <header className="pt-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Statistics Layer
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </div>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl md:text-6xl">
                ADMIN
                <br />
                <span className="text-muted-foreground">STATISTICS MANAGEMENT</span>
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                这里集中维护统计系统依赖的上游中转配置、账号池注册信息，以及统计页卡片结构。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Profiles</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">{String(profiles.length).padStart(2, "0")}</p>
                  </div>
                  <Database className="h-5 w-5" />
                </div>
              </article>
              <article className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Pools</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">{String(pools.length).padStart(2, "0")}</p>
                  </div>
                  <BarChart3 className="h-5 w-5" />
                </div>
              </article>
              <article className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Cards</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">{String(statisticsCards.length).padStart(2, "0")}</p>
                  </div>
                  <Layers3 className="h-5 w-5" />
                </div>
              </article>
            </div>
          </div>
        </header>

        <main className="relative z-10">
          <ControlCenterManager
            initialProfiles={profiles}
            initialPools={pools}
            initialCards={statisticsCards}
          />
        </main>
      </div>
    </div>
  );
}
