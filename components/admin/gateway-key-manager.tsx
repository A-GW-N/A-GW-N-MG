"use client";

import {useEffect, useRef, useState, useTransition} from "react";
import {Copy, KeyRound, Plus, Power, RefreshCcw, Trash2} from "lucide-react";

import {Button} from "@/components/ui/button";
import type {GatewayApiKeySummary} from "@/lib/database/gateway-api-keys";

interface GatewayKeyManagerProps {
  initialKeys: GatewayApiKeySummary[];
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "未使用";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("zh-CN").format(value ?? 0);
}

export function GatewayKeyManager({initialKeys}: GatewayKeyManagerProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [keyName, setKeyName] = useState("");
  const [description, setDescription] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [latestRawKey, setLatestRawKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const refreshTimerRef = useRef<number | null>(null);

  function refreshKeys() {
    setStatusMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/gateway-keys", {cache: "no-store"});
      const result = (await response.json()) as {keys?: GatewayApiKeySummary[]; message?: string};

      if (!response.ok || !result.keys) {
        setStatusMessage(result.message ?? "刷新访问密钥失败");
        return;
      }

      setKeys(result.keys);
    });
  }

  useEffect(() => {
    let cancelled = false;

    const syncKeys = async () => {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }

      const response = await fetch("/api/admin/gateway-keys", {cache: "no-store"});
      const result = (await response.json()) as {keys?: GatewayApiKeySummary[]};
      if (!cancelled && response.ok && result.keys) {
        setKeys(result.keys);
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setInterval(() => {
        void syncKeys();
      }, 10_000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncKeys();
      }
    };

    void syncKeys();
    scheduleRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  function createKey() {
    setStatusMessage(null);
    setLatestRawKey(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/gateway-keys", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          key_name: keyName,
          description,
          is_enabled: true,
        }),
      });

      const result = (await response.json()) as {
        rawKey?: string;
        summary?: GatewayApiKeySummary;
        message?: string;
      };

      if (!response.ok || !result.summary || !result.rawKey) {
        setStatusMessage(result.message ?? "创建访问密钥失败");
        return;
      }

      const summary = result.summary;
      const rawKey = result.rawKey;

      setKeys((current) => [...current, summary]);
      setLatestRawKey(rawKey);
      setKeyName("");
      setDescription("");
      setStatusMessage("新访问密钥已生成，请立即复制保存。");
    });
  }

  function updateKey(
    id: string,
    next: Partial<Pick<GatewayApiKeySummary, "key_name" | "description" | "is_enabled">>
  ) {
    const target = keys.find((item) => item.id === id);
    if (!target) {
      return;
    }

    setStatusMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/gateway-keys", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          id,
          key_name: next.key_name ?? target.key_name,
          description: next.description ?? target.description ?? "",
          is_enabled: next.is_enabled ?? target.is_enabled,
        }),
      });

      const result = (await response.json()) as {keys?: GatewayApiKeySummary[]; message?: string};
      if (!response.ok || !result.keys) {
        setStatusMessage(result.message ?? "更新访问密钥失败");
        return;
      }

      setKeys(result.keys);
      setStatusMessage("访问密钥配置已更新");
    });
  }

  function deleteKey(id: string) {
    setStatusMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/gateway-keys", {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({id}),
      });

      const result = (await response.json()) as {keys?: GatewayApiKeySummary[]; message?: string};
      if (!response.ok || !result.keys) {
        setStatusMessage(result.message ?? "删除访问密钥失败");
        return;
      }

      setKeys(result.keys);
      setStatusMessage("访问密钥已删除");
    });
  }

  async function copyRawKey() {
    if (!latestRawKey) {
      return;
    }

    await navigator.clipboard.writeText(latestRawKey);
    setStatusMessage("原始访问密钥已复制");
  }

  async function copySpecificKey(rawKey: string | null) {
    if (!rawKey) {
      setStatusMessage("该 key 无法恢复，请重置后再复制");
      return;
    }

    await navigator.clipboard.writeText(rawKey);
    setStatusMessage("完整访问密钥已复制");
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Gateway Keys
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">访问密钥管理</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              所有 `/v1/*` 调用都会在这里校验并按 key 记录请求量。密钥只会在创建时显示一次，数据库内仅保存哈希。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={refreshKeys} disabled={isPending} className="rounded-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input
            value={keyName}
            onChange={(event) => setKeyName(event.target.value)}
            className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
            placeholder="密钥名称，例如 production-main"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
            placeholder="用途说明，可选"
          />
          <Button type="button" onClick={createKey} disabled={isPending} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" />
            创建新 key
          </Button>
        </div>

        {latestRawKey ? (
          <div className="mt-4 rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
                  New Raw Key
                </p>
                <p className="mt-2 break-all font-mono text-sm text-foreground">{latestRawKey}</p>
              </div>
              <Button type="button" variant="outline" onClick={copyRawKey} className="rounded-full">
                <Copy className="mr-2 h-4 w-4" />
                复制
              </Button>
            </div>
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mt-4 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            {statusMessage}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {keys.map((key) => (
          <article key={key.id} className="rounded-[1.7rem] border border-border/50 bg-background/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border/40 bg-background/75">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold">{key.key_name}</h3>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{key.key_prefix}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {key.owner_username ? `归属用户：${key.owner_display_name || key.owner_username}` : "管理员密钥"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {key.description?.trim() || "未填写说明"}
                </p>
                <div className="mt-4 rounded-[1.2rem] border border-border/45 bg-background/60 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">完整 Key</p>
                  <p className="mt-2 break-all font-mono text-xs leading-6 text-foreground">
                    {key.raw_key || "历史 key 不可恢复，重置或新建后可完整查看"}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={key.is_enabled}
                  onChange={(event) => updateKey(key.id, {is_enabled: event.target.checked})}
                />
                {key.is_enabled ? "启用" : "停用"}
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">请求数</p>
                <p className="mt-2 text-lg font-semibold">{formatNumber(key.request_count)}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">成功</p>
                <p className="mt-2 text-lg font-semibold text-emerald-500">{formatNumber(key.success_count)}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">失败</p>
                <p className="mt-2 text-lg font-semibold text-rose-500">{formatNumber(key.failed_count)}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tokens</p>
                <p className="mt-2 text-lg font-semibold">{formatNumber(key.total_tokens)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                value={key.key_name}
                onChange={(event) => {
                  const value = event.target.value;
                  setKeys((current) =>
                    current.map((item) => (item.id === key.id ? {...item, key_name: value} : item))
                  );
                }}
                onBlur={() => updateKey(key.id, {key_name: key.key_name})}
                className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
              />
              <input
                value={key.description ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setKeys((current) =>
                    current.map((item) => (item.id === key.id ? {...item, description: value} : item))
                  );
                }}
                onBlur={() => updateKey(key.id, {description: key.description ?? ""})}
                className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
                placeholder="用途说明"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>最近使用：{formatDate(key.last_used_at)}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copySpecificKey(key.raw_key)}
                  className="rounded-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  完整复制
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateKey(key.id, {is_enabled: !key.is_enabled})}
                  className="rounded-full"
                >
                  <Power className="mr-2 h-4 w-4" />
                  {key.is_enabled ? "停用" : "启用"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => deleteKey(key.id)}
                  className="rounded-full text-rose-500 hover:text-rose-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
