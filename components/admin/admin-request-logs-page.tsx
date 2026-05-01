import Link from "next/link";
import {ArrowLeft, FileClock, ShieldCheck, User2} from "lucide-react";

import {AdminLogoutButton} from "@/components/admin/admin-logout-button";
import {CornerPlus} from "@/components/corner-plus";
import {ThemeToggle} from "@/components/theme-toggle";
import type {AdminGatewayRequestLog} from "@/lib/database/admin-logs";

interface AdminRequestLogsPageProps {
  logs: AdminGatewayRequestLog[];
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

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : "暂无";
}

function readMetadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" ? String(value) : "暂无";
}

function readMetadataJson(metadata: Record<string, unknown>, key: string) {
  return metadata[key] ?? {};
}

function readMetadataBoolean(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "boolean" ? String(value) : "暂无";
}

export function AdminRequestLogsPage({logs, isProtected}: AdminRequestLogsPageProps) {
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
            Request Logs
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </div>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl md:text-6xl">
                ADMIN
                <br />
                <span className="text-muted-foreground">REQUEST LOGS</span>
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                这里展示网关请求详细日志，包括请求标识、用户、模型、状态、耗时、token、来源头和扩展 metadata。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Logs</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">{String(logs.length).padStart(2, "0")}</p>
                  </div>
                  <FileClock className="h-5 w-5" />
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
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Users</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">
                      {String(new Set(logs.map((item) => item.user?.id).filter(Boolean)).size).padStart(2, "0")}
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
                    {log.success ? "Success" : "Failed"} · {formatDateTime(log.created_at)}
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {log.mapped_model || log.external_model}
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">request_id: {log.request_id}</p>
                </div>
                <div className="grid gap-2 text-right text-sm text-muted-foreground">
                  <div>brand: {log.brand || "other"}</div>
                  <div>status: {log.status_code ?? "n/a"}</div>
                  <div>latency: {log.latency_ms ?? 0} ms</div>
                  <div>tokens: {log.total_tokens ?? 0}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Request Fields</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>profile_id: {log.profile_id || "暂无"}</div>
                    <div>api_key_id: {log.gateway_api_key_id || "暂无"}</div>
                    <div>api_key_name: {log.gateway_api_key_name || "暂无"}</div>
                    <div>api_key_prefix: {log.gateway_api_key_prefix || "暂无"}</div>
                    <div>request_mode: {log.request_mode}</div>
                    <div>external_model: {log.external_model}</div>
                    <div>mapped_model: {log.mapped_model}</div>
                    <div>pool_table_name: {log.pool_table_name || "暂无"}</div>
                    <div>pool_record_id: {log.pool_record_id || "暂无"}</div>
                    <div>tool_count: {log.tool_count ?? 0}</div>
                    <div>image_count: {log.image_count ?? 0}</div>
                    <div>rpm_count: {log.rpm_count ?? 0}</div>
                    <div>tpm_count: {log.tpm_count ?? 0}</div>
                    <div>input_tokens: {log.input_tokens ?? 0}</div>
                    <div>output_tokens: {log.output_tokens ?? 0}</div>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">User Fields</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>user_id: {log.user_id || "暂无"}</div>
                    <div>username: {log.user?.username || "暂无"}</div>
                    <div>display_name: {log.user?.display_name || "暂无"}</div>
                    <div>role: {log.user?.role || "暂无"}</div>
                    <div>success: {String(log.success)}</div>
                    <div>error_message: {log.error_message || "暂无"}</div>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Metadata</p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs text-muted-foreground dark:bg-white/[0.04]">
                    {formatJson(log.metadata)}
                  </pre>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">HTTP Context</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>http_method: {readMetadataString(log.metadata, "http_method")}</div>
                    <div>request_path: {readMetadataString(log.metadata, "request_path")}</div>
                    <div>request_host: {readMetadataString(log.metadata, "request_host")}</div>
                    <div>request_remote_addr: {readMetadataString(log.metadata, "request_remote_addr")}</div>
                    <div>content_type: {readMetadataString(log.metadata, "content_type")}</div>
                    <div>accept: {readMetadataString(log.metadata, "accept")}</div>
                    <div>content_length: {readMetadataNumber(log.metadata, "content_length")}</div>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Gateway Context</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>profile_key: {readMetadataString(log.metadata, "profile_key")}</div>
                    <div>profile_display_name: {readMetadataString(log.metadata, "profile_display_name")}</div>
                    <div>provider_slug: {readMetadataString(log.metadata, "provider_slug")}</div>
                    <div>upstream_endpoint: {readMetadataString(log.metadata, "upstream_endpoint")}</div>
                    <div>failure_stage: {readMetadataString(log.metadata, "failure_stage")}</div>
                    <div>model_mapping_applied: {readMetadataBoolean(log.metadata, "model_mapping_applied")}</div>
                    <div>selected_pool_source: {readMetadataString(log.metadata, "selected_pool_source")}</div>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Forwarded Headers</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>x_forwarded_for: {readMetadataString(log.metadata, "x_forwarded_for")}</div>
                    <div>x_forwarded_host: {readMetadataString(log.metadata, "x_forwarded_host")}</div>
                    <div>x_forwarded_proto: {readMetadataString(log.metadata, "x_forwarded_proto")}</div>
                    <div>x_real_ip: {readMetadataString(log.metadata, "x_real_ip")}</div>
                    <div>cf_connecting_ip: {readMetadataString(log.metadata, "cf_connecting_ip")}</div>
                    <div>incoming_mode: {readMetadataString(log.metadata, "incoming_mode")}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Upstream Response</p>
                  <div className="mt-3 break-all text-muted-foreground">
                    <div>response_content_type: {readMetadataString(log.metadata, "response_content_type")}</div>
                    <div>response_content_length: {readMetadataString(log.metadata, "response_content_length")}</div>
                    <div>response_server: {readMetadataString(log.metadata, "response_server")}</div>
                    <div>response_request_id: {readMetadataString(log.metadata, "response_request_id")}</div>
                    <div>response_body_size: {readMetadataNumber(log.metadata, "response_body_size")}</div>
                    <div>active_pool_count: {readMetadataNumber(log.metadata, "active_pool_count")}</div>
                    <div>dynamic_pool_table_count: {readMetadataNumber(log.metadata, "dynamic_pool_table_count")}</div>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Pool Resolution</p>
                  <div className="mt-3 text-muted-foreground">
                    <div>active_pool_tables:</div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs dark:bg-white/[0.04]">
                      {formatJson(readMetadataJson(log.metadata, "active_pool_tables"))}
                    </pre>
                    <div className="mt-3">dynamic_pool_tables:</div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs dark:bg-white/[0.04]">
                      {formatJson(readMetadataJson(log.metadata, "dynamic_pool_tables"))}
                    </pre>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4 text-sm leading-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Request Preview</p>
                  <div className="mt-3 text-muted-foreground">
                    <div>normalized_body_preview:</div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs dark:bg-white/[0.04]">
                      {formatJson(readMetadataJson(log.metadata, "normalized_body_preview"))}
                    </pre>
                    <div>request_query:</div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs dark:bg-white/[0.04]">
                      {formatJson(readMetadataJson(log.metadata, "request_query"))}
                    </pre>
                    <div className="mt-3">request_body_preview:</div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs dark:bg-white/[0.04]">
                      {formatJson(readMetadataJson(log.metadata, "request_body_preview"))}
                    </pre>
                    <div className="mt-3">response_body_preview:</div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-black/5 p-3 font-mono text-xs dark:bg-white/[0.04]">
                      {formatJson(readMetadataJson(log.metadata, "response_body_preview"))}
                    </pre>
                  </div>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-[1.8rem] border border-dashed border-border/55 bg-background/45 px-5 py-12 text-sm text-muted-foreground">
              暂无网关请求日志。
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
