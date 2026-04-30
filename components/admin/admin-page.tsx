import Link from "next/link";
import {ArrowRight, BarChart3, FilePenLine, KeyRound, Layers3, ShieldCheck, Users2} from "lucide-react";

import {HomepageBlockManager} from "@/components/admin/homepage-block-manager";
import {AdminLogoutButton} from "@/components/admin/admin-logout-button";
import {CornerPlus} from "@/components/corner-plus";
import {SiteFooter} from "@/components/home/site-footer";
import {ThemeToggle} from "@/components/theme-toggle";
import type {HomepageBlockRow, HomepageContentRow} from "@/lib/types";

interface AdminPageProps {
  blocks: HomepageBlockRow[];
  infoPanel: HomepageContentRow;
  isPasswordProtected: boolean;
}

export function AdminPage({
  blocks,
  infoPanel,
  isPasswordProtected,
}: AdminPageProps) {
  const visibleBlocks = blocks.filter((block) => block.is_active).length;

  return (
    <div className="relative min-h-screen py-4 sm:py-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-8%] h-[420px] w-[420px] rounded-full bg-white/12 blur-[140px]" />
        <div className="absolute right-[-10%] top-[12%] h-[360px] w-[360px] rounded-full bg-white/8 blur-[130px]" />
        <div className="absolute bottom-[-12%] left-[24%] h-[320px] w-[320px] rounded-full bg-white/7 blur-[120px]" />
      </div>

      <CornerPlus className="fixed left-4 top-4 h-6 w-6 text-border md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 text-border md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 text-border md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 text-border md:bottom-8 md:right-8" />

      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 md:right-8 md:top-8">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          Back Home
        </Link>
        {isPasswordProtected && <AdminLogoutButton />}
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1520px] flex-col gap-6 px-3 pb-24 sm:px-4 sm:pb-24 lg:px-6 lg:pb-24 xl:px-8">
        <main className="relative z-10 flex min-h-full flex-col">
          <section className="flex-1 border-b border-border/40 pb-14 pt-2 lg:pb-20">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Management Layer
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ready
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl md:text-6xl">
                    ADMIN
                    <br />
                    <span className="text-muted-foreground">CONTROL CENTER</span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    这里同时维护主页内容、Go 中转配置、统计卡片、账号池注册，以及后续 `/v1` 与 `/user` 体系需要的后台信息。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.68fr)]">
              <article className="rounded-[1.8rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      Homepage Blocks
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-tight">
                      {String(visibleBlocks).padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      当前主页左侧可见方格数量，支持拖动顺序、删除和弹窗编辑。
                    </p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/40 bg-background/75">
                    <Layers3 className="h-5 w-5" />
                  </div>
                </div>
              </article>

              <article className="rounded-[1.8rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      Info Board
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-tight">MD</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      主页右侧信息版支持 Markdown，适合放说明、更新记录和公告。
                    </p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/40 bg-background/75">
                    <FilePenLine className="h-5 w-5" />
                  </div>
                </div>
              </article>
            </div>

            <Link
              href="/admin/management"
              className="mt-6 flex items-center justify-between gap-4 rounded-[1.8rem] border border-border/50 bg-background/68 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:border-border/70 hover:bg-background/78"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/40 bg-background/75">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Security Management
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">访问密钥与用量统计</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    进入独立的 `/admin/management` 页面管理多个 sk、停用或删除 key，并查看每个 key 的请求量与 token 使用情况。
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>

            <Link
              href="/admin/user-management"
              className="mt-4 flex items-center justify-between gap-4 rounded-[1.8rem] border border-border/50 bg-background/68 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:border-border/70 hover:bg-background/78"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/40 bg-background/75">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    User Management
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">用户与邀请码维护</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    进入独立的 `/admin/user-management` 页面管理用户角色、启停、删除、注册模式与邀请码。
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>

            <Link
              href="/admin/statistics-management"
              className="mt-4 flex items-center justify-between gap-4 rounded-[1.8rem] border border-border/50 bg-background/68 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:border-border/70 hover:bg-background/78"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/40 bg-background/75">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Statistics Management
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">统计与中转维护</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    进入独立的 `/admin/statistics-management` 页面维护上游中转、账号池注册和统计卡片定义。
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>

            <div className="mt-6 rounded-[2rem] border border-border/50 bg-background/50 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Homepage Matrix
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">主页内容管理</h2>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border/40 bg-background/75">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <HomepageBlockManager initialBlocks={blocks} initialContent={infoPanel} />
            </div>
          </section>
          <SiteFooter />
        </main>
      </div>
    </div>
  );
}
