import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import type {AccountPoolRegistryRow, GatewayProfileRow} from "@/lib/types";

const GATEWAY_PROFILES_TABLE = "gateway_profiles";
const ACCOUNT_POOL_REGISTRY_TABLE = "account_pool_registry";

export interface GatewayProfileInput {
  profile_key: string;
  display_name: string;
  provider_slug: string;
  endpoint_url: string;
  auth_mode: "bearer" | "api_key" | "none";
  auth_token?: string | null;
  request_mode: "openai" | "messages";
  model_mappings?: Record<string, string> | null;
  brand_mappings?: Record<string, string> | null;
  default_headers?: Record<string, string> | null;
  extra_payload?: Record<string, unknown> | null;
  pool_table_pattern?: string | null;
  is_enabled: boolean;
}

export interface AccountPoolRegistryInput {
  pool_key: string;
  table_name: string;
  display_name: string;
  brand?: string | null;
  metadata?: Record<string, unknown> | null;
  is_enabled: boolean;
}

function normalizeGatewayProfile(profile: GatewayProfileInput): GatewayProfileInput {
  return {
    profile_key: profile.profile_key.trim(),
    display_name: profile.display_name.trim() || profile.profile_key.trim(),
    provider_slug: profile.provider_slug.trim() || "openai-compatible",
    endpoint_url: profile.endpoint_url.trim(),
    auth_mode: profile.auth_mode,
    auth_token: profile.auth_token?.trim() || null,
    request_mode: profile.request_mode,
    model_mappings: profile.model_mappings ?? {},
    brand_mappings: profile.brand_mappings ?? {},
    default_headers: profile.default_headers ?? {},
    extra_payload: profile.extra_payload ?? {},
    pool_table_pattern: profile.pool_table_pattern?.trim() || null,
    is_enabled: Boolean(profile.is_enabled),
  };
}

function normalizePoolRegistry(input: AccountPoolRegistryInput): AccountPoolRegistryInput {
  return {
    pool_key: input.pool_key.trim(),
    table_name: input.table_name.trim(),
    display_name: input.display_name.trim() || input.pool_key.trim(),
    brand: input.brand?.trim() || null,
    metadata: input.metadata ?? {},
    is_enabled: Boolean(input.is_enabled),
  };
}

function isMissingTableError(error: {code?: string; message?: string} | null | undefined, tableName: string) {
  return error?.code === "PGRST205" || error?.message?.includes(tableName);
}

export async function loadGatewayProfiles(): Promise<GatewayProfileRow[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(GATEWAY_PROFILES_TABLE)
    .select("*")
    .order("created_at", {ascending: true});

  if (error) {
    if (!isMissingTableError(error, GATEWAY_PROFILES_TABLE)) {
      console.error("Failed to load gateway profiles:", error);
    }
    return [];
  }

  return (data as GatewayProfileRow[]) ?? [];
}

export async function saveGatewayProfiles(
  profiles: GatewayProfileInput[]
): Promise<GatewayProfileRow[]> {
  const supabase = createAdminClient();
  const payload = profiles
    .filter((profile) => profile.profile_key.trim().length > 0)
    .map(normalizeGatewayProfile);

  if (payload.length === 0) {
    const {error} = await supabase.from(GATEWAY_PROFILES_TABLE).delete().not("profile_key", "is", null);
    if (error) {
      throw new Error(`清空网关配置失败: ${error.message}`);
    }
    return [];
  }

  const {error} = await supabase.from(GATEWAY_PROFILES_TABLE).upsert(payload, {
    onConflict: "profile_key",
  });

  if (error) {
    if (isMissingTableError(error, GATEWAY_PROFILES_TABLE)) {
      throw new Error("gateway_profiles 表不存在，请先执行 supabase/schema.sql。");
    }
    throw new Error(`保存网关配置失败: ${error.message}`);
  }

  const keepKeys = payload.map((item) => item.profile_key);
  const {data: existingRows} = await supabase.from(GATEWAY_PROFILES_TABLE).select("profile_key");
  const removeKeys = ((existingRows as Array<{profile_key: string}> | null) ?? [])
    .map((row) => row.profile_key)
    .filter((key) => !keepKeys.includes(key));

  if (removeKeys.length > 0) {
    await supabase.from(GATEWAY_PROFILES_TABLE).delete().in("profile_key", removeKeys);
  }

  return loadGatewayProfiles();
}

export async function loadAccountPoolRegistry(): Promise<AccountPoolRegistryRow[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(ACCOUNT_POOL_REGISTRY_TABLE)
    .select("*")
    .order("created_at", {ascending: true});

  if (error) {
    if (!isMissingTableError(error, ACCOUNT_POOL_REGISTRY_TABLE)) {
      console.error("Failed to load account pool registry:", error);
    }
    return [];
  }

  return (data as AccountPoolRegistryRow[]) ?? [];
}

export async function saveAccountPoolRegistry(
  rows: AccountPoolRegistryInput[]
): Promise<AccountPoolRegistryRow[]> {
  const supabase = createAdminClient();
  const payload = rows
    .filter((row) => row.pool_key.trim().length > 0)
    .map(normalizePoolRegistry);

  if (payload.length === 0) {
    const {error} = await supabase.from(ACCOUNT_POOL_REGISTRY_TABLE).delete().not("pool_key", "is", null);
    if (error) {
      throw new Error(`清空账号池注册失败: ${error.message}`);
    }
    return [];
  }

  const {error} = await supabase.from(ACCOUNT_POOL_REGISTRY_TABLE).upsert(payload, {
    onConflict: "pool_key",
  });

  if (error) {
    if (isMissingTableError(error, ACCOUNT_POOL_REGISTRY_TABLE)) {
      throw new Error("account_pool_registry 表不存在，请先执行 supabase/schema.sql。");
    }
    throw new Error(`保存账号池注册失败: ${error.message}`);
  }

  const keepKeys = payload.map((item) => item.pool_key);
  const {data: existingRows} = await supabase.from(ACCOUNT_POOL_REGISTRY_TABLE).select("pool_key");
  const removeKeys = ((existingRows as Array<{pool_key: string}> | null) ?? [])
    .map((row) => row.pool_key)
    .filter((key) => !keepKeys.includes(key));

  if (removeKeys.length > 0) {
    await supabase.from(ACCOUNT_POOL_REGISTRY_TABLE).delete().in("pool_key", removeKeys);
  }

  return loadAccountPoolRegistry();
}
