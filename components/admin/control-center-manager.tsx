"use client";

import {useMemo, useState, useTransition} from "react";
import {Layers3, Plus, Save, ServerCog, WalletCards} from "lucide-react";

import {Button} from "@/components/ui/button";
import type {AccountPoolRegistryRow, GatewayProfileRow, StatisticsCardRow} from "@/lib/types";

interface EditableProfile {
  profile_key: string;
  display_name: string;
  provider_slug: string;
  endpoint_url: string;
  auth_mode: "bearer" | "api_key" | "none";
  auth_token: string;
  request_mode: "openai" | "messages";
  model_mappings_json: string;
  brand_mappings_json: string;
  default_headers_json: string;
  extra_payload_json: string;
  pool_table_pattern: string;
  is_enabled: boolean;
}

interface EditablePool {
  pool_key: string;
  table_name: string;
  display_name: string;
  brand: string;
  metadata_json: string;
  is_enabled: boolean;
}

interface EditableCard {
  card_key: string;
  title: string;
  card_type: string;
  description: string;
  settings_json: string;
  is_enabled: boolean;
}

interface ControlCenterManagerProps {
  initialProfiles: GatewayProfileRow[];
  initialPools: AccountPoolRegistryRow[];
  initialCards: StatisticsCardRow[];
}

function toPrettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonInput(value: string) {
  if (!value.trim()) {
    return {};
  }
  return JSON.parse(value) as Record<string, unknown>;
}

function createEditableProfile(profile?: GatewayProfileRow, index = 0): EditableProfile {
  return {
    profile_key: profile?.profile_key ?? `profile-${String(index + 1).padStart(2, "0")}`,
    display_name: profile?.display_name ?? `Profile ${String(index + 1).padStart(2, "0")}`,
    provider_slug: profile?.provider_slug ?? "openai-compatible",
    endpoint_url: profile?.endpoint_url ?? "",
    auth_mode: profile?.auth_mode ?? "bearer",
    auth_token: profile?.auth_token ?? "",
    request_mode: profile?.request_mode ?? "openai",
    model_mappings_json: toPrettyJson(profile?.model_mappings),
    brand_mappings_json: toPrettyJson(profile?.brand_mappings),
    default_headers_json: toPrettyJson(profile?.default_headers),
    extra_payload_json: toPrettyJson(profile?.extra_payload),
    pool_table_pattern: profile?.pool_table_pattern ?? "%-pool",
    is_enabled: profile?.is_enabled ?? true,
  };
}

function createEditablePool(pool?: AccountPoolRegistryRow, index = 0): EditablePool {
  return {
    pool_key: pool?.pool_key ?? "",
    table_name: pool?.table_name ?? "main-pool",
    display_name: pool?.display_name ?? `Pool ${String(index + 1).padStart(2, "0")}`,
    brand: pool?.brand ?? "other",
    metadata_json: toPrettyJson(pool?.metadata),
    is_enabled: pool?.is_enabled ?? true,
  };
}

function createEditableCard(card?: StatisticsCardRow, index = 0): EditableCard {
  return {
    card_key: card?.card_key ?? `custom-card-${String(index + 1).padStart(2, "0")}`,
    title: card?.title ?? `Card ${String(index + 1).padStart(2, "0")}`,
    card_type: card?.card_type ?? "custom",
    description: card?.description ?? "",
    settings_json: toPrettyJson(card?.settings),
    is_enabled: card?.is_enabled ?? true,
  };
}

export function ControlCenterManager({
  initialProfiles,
  initialPools,
  initialCards,
}: ControlCenterManagerProps) {
  const [profiles, setProfiles] = useState<EditableProfile[]>(
    initialProfiles.map((profile, index) => createEditableProfile(profile, index))
  );
  const [pools, setPools] = useState<EditablePool[]>(
    initialPools.map((pool, index) => createEditablePool(pool, index))
  );
  const [cards, setCards] = useState<EditableCard[]>(
    initialCards.map((card, index) => createEditableCard(card, index))
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counters = useMemo(
    () => ({
      profiles: profiles.filter((item) => item.is_enabled).length,
      pools: pools.filter((item) => item.is_enabled).length,
      cards: cards.filter((item) => item.is_enabled).length,
    }),
    [cards, pools, profiles]
  );

  function saveAll() {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          profiles: profiles.map((profile) => ({
            profile_key: profile.profile_key,
            display_name: profile.display_name,
            provider_slug: profile.provider_slug,
            endpoint_url: profile.endpoint_url,
            auth_mode: profile.auth_mode,
            auth_token: profile.auth_token,
            request_mode: profile.request_mode,
            model_mappings: parseJsonInput(profile.model_mappings_json) as Record<string, string>,
            brand_mappings: parseJsonInput(profile.brand_mappings_json) as Record<string, string>,
            default_headers: parseJsonInput(profile.default_headers_json) as Record<string, string>,
            extra_payload: parseJsonInput(profile.extra_payload_json),
            pool_table_pattern: profile.pool_table_pattern,
            is_enabled: profile.is_enabled,
          })),
          pools: pools.map((pool) => ({
            pool_key: pool.pool_key,
            table_name: pool.table_name,
            display_name: pool.display_name,
            brand: pool.brand,
            metadata: parseJsonInput(pool.metadata_json),
            is_enabled: pool.is_enabled,
          })),
          cards: cards.map((card, index) => ({
            card_key: card.card_key,
            title: card.title,
            card_type: card.card_type,
            description: card.description,
            sort_order: index,
            is_enabled: card.is_enabled,
            settings: parseJsonInput(card.settings_json),
          })),
        };

        const response = await fetch("/api/admin/control-center", {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(payload),
        });

        const result = (await response.json()) as {
          profiles?: GatewayProfileRow[];
          pools?: AccountPoolRegistryRow[];
          cards?: StatisticsCardRow[];
          message?: string;
        };

        if (!response.ok || !result.profiles || !result.pools || !result.cards) {
          throw new Error(result.message ?? "保存控制中心失败");
        }

        setProfiles(result.profiles.map((profile, index) => createEditableProfile(profile, index)));
        setPools(result.pools.map((pool, index) => createEditablePool(pool, index)));
        setCards(result.cards.map((card, index) => createEditableCard(card, index)));
        setStatusMessage("控制中心配置已保存");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "保存控制中心失败");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.9rem] border border-border/50 bg-background/72 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Control Center
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            这里统一维护 Go 中转配置、账号池注册和统计卡片定义，后续 `/v1` 和统计页都会直接读取这里的数据。
          </p>
        </div>
        <Button type="button" onClick={saveAll} disabled={isPending} className="rounded-full">
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save Control Center"}
        </Button>
      </div>

      {statusMessage ? (
        <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Profiles</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{String(counters.profiles).padStart(2, "0")}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">网关主配置表条目数量。</p>
            </div>
            <ServerCog className="h-5 w-5" />
          </div>
        </article>
        <article className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Pools</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{String(counters.pools).padStart(2, "0")}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">账号池注册与扫描入口数量。</p>
            </div>
            <WalletCards className="h-5 w-5" />
          </div>
        </article>
        <article className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Statistics Cards</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{String(counters.cards).padStart(2, "0")}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">统计页卡片与排序定义数量。</p>
            </div>
            <Layers3 className="h-5 w-5" />
          </div>
        </article>
      </div>

      <section className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Gateway Profiles</p>
            <h3 className="mt-2 text-xl font-semibold">中转配置维护</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              上游地址直接填写在 `endpoint_url`，例如 `https://api.openai.com/v1/chat/completions`。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setProfiles((current) => [...current, createEditableProfile(undefined, current.length)])} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Button>
        </div>
        <div className="grid gap-4">
          {profiles.map((profile, index) => (
            <div key={`${profile.profile_key}-${index}`} className="rounded-[1.5rem] border border-border/45 bg-background/60 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input value={profile.profile_key} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, profile_key: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="profile_key" />
                <input value={profile.display_name} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, display_name: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="display_name" />
                <input value={profile.provider_slug} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, provider_slug: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="provider_slug" />
                <input value={profile.endpoint_url} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, endpoint_url: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="上游地址 endpoint_url，例如 https://api.openai.com/v1/chat/completions" />
                <input type="password" value={profile.auth_token} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, auth_token: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="auth_token" />
                <input value={profile.pool_table_pattern} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, pool_table_pattern: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="pool_table_pattern" />
                <select value={profile.auth_mode} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, auth_mode: event.target.value as EditableProfile["auth_mode"]} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none">
                  <option value="bearer">bearer</option>
                  <option value="api_key">api_key</option>
                  <option value="none">none</option>
                </select>
                <select value={profile.request_mode} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, request_mode: event.target.value as EditableProfile["request_mode"]} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none">
                  <option value="openai">openai</option>
                  <option value="messages">messages</option>
                </select>
                <textarea value={profile.model_mappings_json} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, model_mappings_json: event.target.value} : item))} className="min-h-28 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none md:col-span-2" placeholder="model_mappings JSON" />
                <textarea value={profile.brand_mappings_json} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, brand_mappings_json: event.target.value} : item))} className="min-h-28 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none md:col-span-2" placeholder="brand_mappings JSON" />
                <textarea value={profile.default_headers_json} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, default_headers_json: event.target.value} : item))} className="min-h-24 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none md:col-span-2" placeholder="default_headers JSON" />
                <textarea value={profile.extra_payload_json} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, extra_payload_json: event.target.value} : item))} className="min-h-24 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none md:col-span-2" placeholder="extra_payload JSON" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={profile.is_enabled} onChange={(event) => setProfiles((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, is_enabled: event.target.checked} : item))} />
                  Enabled
                </label>
                <Button type="button" variant="outline" onClick={() => setProfiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-full">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Account Pools</p>
            <h3 className="mt-2 text-xl font-semibold">账号池维护</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              这里只需要维护显示名称和真实表名。统计页会直接扫描对应数据表的行数，行数就是账号总数。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setPools((current) => [...current, createEditablePool(undefined, current.length)])} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Pool
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {pools.map((pool, index) => (
            <div key={`${pool.pool_key}-${index}`} className="rounded-[1.5rem] border border-border/45 bg-background/60 p-4">
              <div className="grid gap-3">
                <input value={pool.display_name} onChange={(event) => setPools((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, display_name: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="显示名称，例如 OpenAI 主号池" />
                <input value={pool.table_name} onChange={(event) => setPools((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, table_name: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="真实表名，例如 main-pool" />
                <input value={pool.pool_key} onChange={(event) => setPools((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, pool_key: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="pool_key，可留空自动生成" />
                <input value={pool.brand} onChange={(event) => setPools((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, brand: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="brand" />
                <textarea value={pool.metadata_json} onChange={(event) => setPools((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, metadata_json: event.target.value} : item))} className="min-h-24 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="metadata JSON（可选）" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={pool.is_enabled} onChange={(event) => setPools((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, is_enabled: event.target.checked} : item))} />
                  Enabled
                </label>
                <Button type="button" variant="outline" onClick={() => setPools((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-full">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Statistics Cards</p>
            <h3 className="mt-2 text-xl font-semibold">统计卡片维护</h3>
          </div>
          <Button type="button" variant="outline" onClick={() => setCards((current) => [...current, createEditableCard(undefined, current.length)])} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => (
            <div key={`${card.card_key}-${index}`} className="rounded-[1.5rem] border border-border/45 bg-background/60 p-4">
              <div className="grid gap-3">
                <input value={card.card_key} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, card_key: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="card_key" />
                <input value={card.title} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, title: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="title" />
                <input value={card.card_type} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, card_type: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="card_type" />
                <input value={card.description} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, description: event.target.value} : item))} className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="description" />
                <textarea value={card.settings_json} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, settings_json: event.target.value} : item))} className="min-h-24 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none" placeholder="settings JSON" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={card.is_enabled} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, is_enabled: event.target.checked} : item))} />
                  Enabled
                </label>
                <Button type="button" variant="outline" onClick={() => setCards((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-full">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
