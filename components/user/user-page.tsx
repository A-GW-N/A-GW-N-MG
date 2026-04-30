"use client";

import {useMemo, useState, useTransition} from "react";
import Link from "next/link";
import {Activity, Copy, Gauge, KeyRound, LogOut, RefreshCcw, ShieldCheck, User2} from "lucide-react";
import {useRouter} from "next/navigation";

import {SiteFooter} from "@/components/home/site-footer";
import {ThemeToggle} from "@/components/theme-toggle";
import {Button} from "@/components/ui/button";
import type {UserPortalData} from "@/lib/database/user-portal";
import type {UserAccountRow} from "@/lib/types";

interface UserPageProps {
  user: UserAccountRow;
  portalData: UserPortalData;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("zh-CN").format(value ?? 0);
}

function buildInitials(label: string) {
  return label.trim().slice(0, 2).toUpperCase();
}

export function UserPage({user, portalData}: UserPageProps) {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentRawKey, setCurrentRawKey] = useState<string | null>(portalData.ownedKey?.raw_key ?? null);

  const headerName = user.display_name?.trim() || user.username;
  const latestModels = useMemo(() => portalData.models.slice(0, 8), [portalData.models]);
  const canAccessAdmin = user.role?.trim().toLowerCase() === "admin";

  function handleLogout() {
    startTransition(async () => {
      await fetch("/api/user/session", {method: "DELETE"});
      router.refresh();
    });
  }

  function copyKey() {
    if (!currentRawKey) {
      return;
    }

    void navigator.clipboard.writeText(currentRawKey);
    setStatusMessage("个人访问 key 已复制");
  }

  function rotateKey() {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/user/key", {method: "POST"});
        const result = (await response.json()) as {
          key?: {raw_key?: string | null};
          message?: string;
        };

        if (!response.ok || !result.key) {
          throw new Error(result.message ?? "重置 key 失败");
        }

        setCurrentRawKey(result.key.raw_key ?? null);
        setStatusMessage("个人访问 key 已重置");
        router.refresh();
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "重置 key 失败");
      }
    });
  }

  const shellCardClass =
    "rounded-[2rem] border border-black/8 bg-[#f6f6f2]/94 shadow-[0_24px_70px_rgba(15,15,15,0.1)] dark:border-white/10 dark:bg-[#101114]/92 dark:shadow-[0_24px_70px_rgba(0,0,0,0.32)]";
  const infoCardClass =
    "rounded-[1.4rem] border border-black/8 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]";
  const labelClass =
    "text-xs font-semibold uppercase tracking-[0.28em] text-foreground/38 dark:text-white/34";
  const softTextClass = "text-muted-foreground dark:text-white/50";
  const metaTextClass = "text-foreground/48 dark:text-white/42";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7f2] py-4 text-foreground sm:py-6 dark:bg-[#08090b] dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(255,255,255,0.96),transparent_22%),radial-gradient(circle_at_84%_16%,rgba(255,255,255,0.62),transparent_24%),linear-gradient(180deg,#f8f8f5_0%,#efefea_100%)] dark:bg-[radial-gradient(circle_at_14%_12%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_84%_16%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,#08090b_0%,#0a0b0f_100%)]" />
      </div>

      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 md:right-8 md:top-8">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full border border-black/8 bg-white/75 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
        >
          Back Home
        </Link>
        <Button type="button" variant="outline" onClick={handleLogout} disabled={isPending} className="rounded-full">
          <LogOut className="mr-2 h-4 w-4" />
          {isPending ? "Leaving..." : "Logout"}
        </Button>
        {canAccessAdmin ? (
          <Link
            href="/api/admin/session?redirect=/admin"
            className="inline-flex h-10 items-center justify-center rounded-full border border-black/8 bg-white/75 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
          >
            Admin
          </Link>
        ) : null}
        <ThemeToggle />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1380px] flex-col px-4 pb-24 sm:px-6 lg:px-8">
        <section className="flex-1 border-b border-black/8 pb-14 pt-3 dark:border-white/8 lg:pb-20">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <article className={`${shellCardClass} p-6`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={headerName}
                      className="h-16 w-16 rounded-[1.4rem] border border-black/8 object-cover dark:border-white/10"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] border border-black/8 bg-black/[0.03] text-lg font-black text-foreground/80 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80">
                      {buildInitials(headerName)}
                    </div>
                  )}
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/38">
                      User Center
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/55 dark:bg-white/60" />
                    </div>
                    <h1 className="mt-4 text-4xl font-black leading-none tracking-[-0.06em] text-foreground dark:text-white sm:text-5xl">
                      {headerName}
                    </h1>
                    <p className={`mt-3 text-sm ${softTextClass}`}>@{user.username}</p>
                  </div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-black/8 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]">
                  <User2 className="h-5 w-5 text-foreground/75 dark:text-white/75" />
                </div>
              </div>

              <div className="mt-8 rounded-[1.8rem] border border-black/8 bg-white/55 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/38 dark:text-white/34">Personal Key</p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground dark:text-white">
                      {portalData.ownedKey?.key_name || user.username}
                    </h2>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-black/8 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]">
                    <KeyRound className="h-5 w-5 text-foreground/70 dark:text-white/70" />
                  </div>
                </div>

                <div className="mt-4 rounded-[1.4rem] border border-black/8 bg-[#f1f1ec] px-4 py-4 font-mono text-sm text-foreground/88 dark:border-white/10 dark:bg-black/30 dark:text-white/88">
                  {currentRawKey || "当前 key 不可恢复，请点击重置生成新 key"}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={copyKey} disabled={!currentRawKey} className="rounded-full">
                    <Copy className="mr-2 h-4 w-4" />
                    复制 key
                  </Button>
                  <Button type="button" onClick={rotateKey} disabled={isPending} className="rounded-full">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {isPending ? "Resetting..." : "重置 key"}
                  </Button>
                </div>

                {statusMessage ? (
                  <div className="mt-4 rounded-[1.2rem] border border-black/8 bg-black/[0.02] px-4 py-3 text-sm text-foreground/62 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/62">
                    {statusMessage}
                  </div>
                ) : null}
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className={`${shellCardClass} rounded-[1.8rem] p-5`}>
                <Activity className="h-5 w-5 text-foreground/68 dark:text-white/68" />
                <p className={`mt-4 ${labelClass}`}>Requests</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-foreground dark:text-white">{formatNumber(portalData.usage.request_count)}</p>
              </article>
              <article className={`${shellCardClass} rounded-[1.8rem] p-5`}>
                <ShieldCheck className="h-5 w-5 text-foreground/68 dark:text-white/68" />
                <p className={`mt-4 ${labelClass}`}>Total Tokens</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-foreground dark:text-white">{formatNumber(portalData.usage.total_tokens)}</p>
              </article>
              <article className={`${shellCardClass} rounded-[1.8rem] p-5`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${metaTextClass}`}>Success</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-emerald-400">{formatNumber(portalData.usage.success_count)}</p>
              </article>
              <article className={`${shellCardClass} rounded-[1.8rem] p-5`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${metaTextClass}`}>Failed</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-rose-400">{formatNumber(portalData.usage.failed_count)}</p>
              </article>
              <article className={`${shellCardClass} rounded-[1.8rem] p-5`}>
                <Gauge className="h-5 w-5 text-foreground/68 dark:text-white/68" />
                <p className={`mt-4 ${labelClass}`}>RPM</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-foreground dark:text-white">{formatNumber(portalData.usage.rpm_count)}</p>
              </article>
              <article className={`${shellCardClass} rounded-[1.8rem] p-5`}>
                <Gauge className="h-5 w-5 text-foreground/68 dark:text-white/68" />
                <p className={`mt-4 ${labelClass}`}>TPM</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-foreground dark:text-white">{formatNumber(portalData.usage.tpm_count)}</p>
              </article>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(360px,0.82fr)_minmax(520px,1.18fr)]">
            <section className={`${shellCardClass} flex h-[34rem] min-h-[34rem] flex-col p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={labelClass}>Model Usage</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground dark:text-white">模型分布</h2>
                </div>
                <span className={`text-sm ${metaTextClass}`}>{latestModels.length} models</span>
              </div>

              <div className="mt-5 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-3">
                {latestModels.length > 0 ? latestModels.map((model) => (
                  <div key={`${model.model_name}-${model.brand}`} className={`${infoCardClass} px-4 py-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground dark:text-white">{model.model_name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-foreground/36 dark:text-white/36">{model.brand}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground dark:text-white">{formatNumber(model.request_count)} req</p>
                        <p className={`mt-1 text-xs ${metaTextClass}`}>{formatNumber(model.total_tokens)} tokens</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className={`${infoCardClass} px-4 py-5 text-sm text-foreground/45 dark:text-white/45`}>
                    暂无模型调用记录
                  </div>
                )}
                </div>
              </div>
            </section>

            <section className={`${shellCardClass} flex h-[34rem] min-h-[34rem] flex-col p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={labelClass}>Recent Logs</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground dark:text-white">最近调用</h2>
                </div>
                <span className={`text-sm ${metaTextClass}`}>北京时间</span>
              </div>

              <div className="mt-5 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-3">
                {portalData.logs.length > 0 ? portalData.logs.map((log) => (
                  <div key={log.id} className={`${infoCardClass} px-4 py-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground dark:text-white">
                          {log.mapped_model || log.external_model}
                        </p>
                        <p className={`mt-1 text-xs ${metaTextClass}`}>
                          {formatDateTime(log.created_at)} · {log.success ? "成功" : `失败 ${log.status_code ?? ""}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground dark:text-white">{formatNumber(log.total_tokens)} tokens</p>
                        <p className={`mt-1 text-xs ${metaTextClass}`}>{formatNumber(log.latency_ms)} ms</p>
                      </div>
                    </div>
                    {log.error_message ? (
                      <p className="mt-3 text-xs leading-6 text-rose-300/80">{log.error_message}</p>
                    ) : null}
                  </div>
                )) : (
                  <div className={`${infoCardClass} px-4 py-5 text-sm text-foreground/45 dark:text-white/45`}>
                    暂无调用日志
                  </div>
                )}
                </div>
              </div>
            </section>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
