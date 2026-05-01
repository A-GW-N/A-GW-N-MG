import Link from "next/link";
import {ArrowLeft, LogIn, ShieldCheck, User2} from "lucide-react";

import {AdminLogoutButton} from "@/components/admin/admin-logout-button";
import {CornerPlus} from "@/components/corner-plus";
import {ThemeToggle} from "@/components/theme-toggle";
import type {AdminAuthEventLog} from "@/lib/database/auth-logs";

interface AdminAuthLogsPageProps {
  logs: AdminAuthEventLog[];
  isProtected: boolean;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function AdminAuthLogsPage({logs, isProtected}: AdminAuthLogsPageProps) {
  return (
    <div className="relative min-h-screen py-4 sm:py-6">
      <CornerPlus className="fixed left-4 top-4 h-6 w-6 text-border md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 text-border md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 text-border md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 text-border md:bottom-8 md:right-8" />

      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 md:right-8 md:top-8">
        <Link
          href="/admin/logs"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back Logs
        </Link>
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          Back Admin
        </Link>
        {isProtected ? <AdminLogoutButton /> : null}
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1680px] flex-col gap-6 px-3 pb-24 sm:px-4 lg:px-6 xl:px-8">
        <header className="pt-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Auth Logs
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </div>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl md:text-6xl">
                ADMIN
                <br />
                <span className="text-muted-foreground">AUTH LOGS</span>
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                这里展示登录、退出、权限拒绝、邀请码流程等认证相关日志，也就是你说缺失的登录日志。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Logs</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">{String(logs.length).padStart(2, "0")}</p>
                  </div>
                  <LogIn className="h-5 w-5" />
                </div>
              </article>
              <article className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Success</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">
                      {String(logs.filter((item) => item.success).length).padStart(2, "0")}
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </article>
              <article className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Actors</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">
                      {String(new Set(logs.map((item) => item.actor_user_id || item.actor_username).filter(Boolean)).size).padStart(2, "0")}
                    </p>
                  </div>
                  <User2 className="h-5 w-5" />
                </div>
              </article>
            </div>
          </div>
        </header>

        <main className="relative z-10 grid gap-4">
          {logs.length > 0 ? logs.map((log) => (
            <article
              key={log.id}
              className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {log.category} · {log.success ? "Success" : "Failed"} · {formatDateTime(log.created_at)}
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">{log.event_type}</h2>
                  <p className="text-sm text-muted-foreground">{log.message || "暂无说明"}</p>
                </div>
                <div className="grid gap-2 text-right text-sm text-muted-foreground">
                  <div>scope: {log.auth_scope}</div>
                  <div>provider: {log.provider || "暂无"}</div>
                  <div>target: {log.target_path || "暂无"}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Actor Fields</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>actor_user_id: {log.actor_user_id || "暂无"}</div>
                    <div>actor_username: {log.actor_username || "暂无"}</div>
                    <div>actor_display_name: {log.actor_display_name || "暂无"}</div>
                    <div>actor_role: {log.actor_role || "暂无"}</div>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Client Fields</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>ip_address: {log.ip_address || "暂无"}</div>
                    <div>user_agent: {log.user_agent || "暂无"}</div>
                    <div>success: {String(log.success)}</div>
                    <div>category: {log.category}</div>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Metadata</p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs text-muted-foreground dark:bg-white/[0.04]">
                    {formatJson(log.metadata)}
                  </pre>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-[1.8rem] border border-dashed border-border/55 bg-background/45 px-5 py-12 text-sm text-muted-foreground">
              暂无认证登录日志。
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
