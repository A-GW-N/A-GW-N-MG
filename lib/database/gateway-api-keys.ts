import "server-only";

import {createHash, randomBytes} from "node:crypto";

import {decryptGatewayKey, encryptGatewayKey} from "@/lib/security/gateway-key-crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import type {GatewayApiKeyRow, GatewayApiKeyUsageRow} from "@/lib/types";

const GATEWAY_API_KEYS_TABLE = "gateway_api_keys";
const GATEWAY_API_KEY_USAGE_VIEW = "gateway_api_key_usage";

export interface GatewayApiKeyCreateInput {
  key_name: string;
  description?: string | null;
  is_enabled?: boolean;
  owner_user_id?: string | null;
  key_scope?: "admin" | "user";
}

export interface GatewayApiKeyUpdateInput {
  id: string;
  key_name: string;
  description?: string | null;
  is_enabled: boolean;
}

export interface GatewayApiKeySummary extends Omit<GatewayApiKeyRow, "secret_hash"> {
  request_count: number;
  success_count: number;
  failed_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  raw_key: string | null;
  owner_username: string | null;
  owner_display_name: string | null;
}

export interface CreatedGatewayApiKeyResult {
  rawKey: string;
  summary: GatewayApiKeySummary;
}

function isMissingTableError(error: {code?: string; message?: string} | null | undefined, tableName: string) {
  return error?.code === "PGRST205" || error?.message?.includes(tableName);
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildKeyPrefix(rawKey: string) {
  return rawKey.length <= 12 ? rawKey : `${rawKey.slice(0, 12)}...`;
}

function buildRawGatewayApiKey() {
  return `sk-${randomBytes(24).toString("base64url")}`;
}

function sanitizeKeyName(value: string) {
  return value.trim();
}

type GatewayApiKeyOwnerSelect = {
  username?: string | null;
  display_name?: string | null;
} | null;

function toSummary(
  row: GatewayApiKeyRow & {owner?: GatewayApiKeyOwnerSelect},
  usageMap: Map<string, GatewayApiKeyUsageRow>
): GatewayApiKeySummary {
  const usage = usageMap.get(row.id);

  return {
    id: row.id,
    key_name: row.key_name,
    key_prefix: row.key_prefix,
    encrypted_key: row.encrypted_key ?? null,
    description: row.description ?? null,
    key_scope: row.key_scope ?? "admin",
    owner_user_id: row.owner_user_id ?? null,
    is_enabled: row.is_enabled,
    last_used_at: usage?.last_used_at ?? row.last_used_at ?? null,
    last_used_request_id: row.last_used_request_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    request_count: usage?.request_count ?? 0,
    success_count: usage?.success_count ?? 0,
    failed_count: usage?.failed_count ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
    raw_key: decryptGatewayKey(row.encrypted_key ?? null),
    owner_username: row.owner?.username?.trim() || null,
    owner_display_name: row.owner?.display_name?.trim() || null,
  };
}

async function loadUsageMap() {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(GATEWAY_API_KEY_USAGE_VIEW)
    .select("*");

  if (error) {
    if (!isMissingTableError(error, GATEWAY_API_KEY_USAGE_VIEW)) {
      console.error("Failed to load gateway api key usage:", error);
    }
    return new Map<string, GatewayApiKeyUsageRow>();
  }

  const rows = (data as GatewayApiKeyUsageRow[] | null) ?? [];
  return new Map(rows.map((row) => [row.gateway_api_key_id, row]));
}

export async function loadGatewayApiKeys(): Promise<GatewayApiKeySummary[]> {
  const supabase = createAdminClient();
  const [{data, error}, usageMap] = await Promise.all([
    supabase
      .from(GATEWAY_API_KEYS_TABLE)
      .select("*, owner:user_accounts(username, display_name)")
      .order("created_at", {ascending: true}),
    loadUsageMap(),
  ]);

  if (error) {
    if (!isMissingTableError(error, GATEWAY_API_KEYS_TABLE)) {
      console.error("Failed to load gateway api keys:", error);
    }
    return [];
  }

  const rows = (data as (GatewayApiKeyRow & {owner?: GatewayApiKeyOwnerSelect})[] | null) ?? [];
  return rows.map((row) => toSummary(row, usageMap));
}

export async function createGatewayApiKey(
  input: GatewayApiKeyCreateInput
): Promise<CreatedGatewayApiKeyResult> {
  const supabase = createAdminClient();
  const keyName = sanitizeKeyName(input.key_name);

  if (!keyName) {
    throw new Error("密钥名称不能为空");
  }

  const rawKey = buildRawGatewayApiKey();
  const payload = {
    key_name: keyName,
    key_prefix: buildKeyPrefix(rawKey),
    secret_hash: sha256Hex(rawKey),
    encrypted_key: encryptGatewayKey(rawKey),
    description: input.description?.trim() || null,
    owner_user_id: input.owner_user_id?.trim() || null,
    key_scope: input.key_scope ?? (input.owner_user_id ? "user" : "admin"),
    is_enabled: input.is_enabled ?? true,
  };

  const {data, error} = await supabase
    .from(GATEWAY_API_KEYS_TABLE)
    .insert(payload)
    .select("*, owner:user_accounts(username, display_name)")
    .single();

  if (error) {
    if (isMissingTableError(error, GATEWAY_API_KEYS_TABLE)) {
      throw new Error("gateway_api_keys 表不存在，请先执行 supabase/schema.sql。");
    }
    throw new Error(`创建访问密钥失败: ${error.message}`);
  }

  const row = data as GatewayApiKeyRow & {owner?: GatewayApiKeyOwnerSelect};
  return {
    rawKey,
    summary: {
      id: row.id,
      key_name: row.key_name,
      key_prefix: row.key_prefix,
      encrypted_key: row.encrypted_key ?? null,
      description: row.description ?? null,
      key_scope: row.key_scope ?? "admin",
      owner_user_id: row.owner_user_id ?? null,
      is_enabled: row.is_enabled,
      last_used_at: row.last_used_at ?? null,
      last_used_request_id: row.last_used_request_id ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      request_count: 0,
      success_count: 0,
      failed_count: 0,
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      raw_key: rawKey,
      owner_username: row.owner?.username?.trim() || null,
      owner_display_name: row.owner?.display_name?.trim() || null,
    },
  };
}

export async function updateGatewayApiKey(
  input: GatewayApiKeyUpdateInput
): Promise<GatewayApiKeySummary[]> {
  const supabase = createAdminClient();
  const keyName = sanitizeKeyName(input.key_name);

  if (!input.id.trim()) {
    throw new Error("缺少密钥 ID");
  }

  if (!keyName) {
    throw new Error("密钥名称不能为空");
  }

  const {error} = await supabase
    .from(GATEWAY_API_KEYS_TABLE)
    .update({
      key_name: keyName,
      description: input.description?.trim() || null,
      is_enabled: Boolean(input.is_enabled),
    })
    .eq("id", input.id);

  if (error) {
    throw new Error(`更新访问密钥失败: ${error.message}`);
  }

  return loadGatewayApiKeys();
}

export async function deleteGatewayApiKey(id: string): Promise<GatewayApiKeySummary[]> {
  const supabase = createAdminClient();

  if (!id.trim()) {
    throw new Error("缺少密钥 ID");
  }

  const {error} = await supabase
    .from(GATEWAY_API_KEYS_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`删除访问密钥失败: ${error.message}`);
  }

  return loadGatewayApiKeys();
}

export interface GatewayApiKeyAuthRecord {
  id: string;
  key_name: string;
  key_prefix: string;
  secret_hash: string;
  owner_user_id: string | null;
  is_enabled: boolean;
}

export async function loadGatewayApiKeyAuthRecords(): Promise<GatewayApiKeyAuthRecord[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(GATEWAY_API_KEYS_TABLE)
    .select("id, key_name, key_prefix, secret_hash, owner_user_id, is_enabled")
    .eq("is_enabled", true)
    .order("created_at", {ascending: true});

  if (error) {
    if (!isMissingTableError(error, GATEWAY_API_KEYS_TABLE)) {
      console.error("Failed to load gateway api key auth records:", error);
    }
    return [];
  }

  return ((data as GatewayApiKeyAuthRecord[] | null) ?? []).filter((row) => row.is_enabled);
}

export async function touchGatewayApiKeyUsage(keyId: string, requestId: string) {
  if (!keyId.trim()) {
    return;
  }

  const supabase = createAdminClient();
  const {error} = await supabase
    .from(GATEWAY_API_KEYS_TABLE)
    .update({
      last_used_at: new Date().toISOString(),
      last_used_request_id: requestId,
    })
    .eq("id", keyId);

  if (error) {
    console.error("Failed to touch gateway api key usage:", error);
  }
}

export async function loadUserGatewayApiKey(userId: string) {
  const supabase = createAdminClient();
  const [{data, error}, usageMap] = await Promise.all([
    supabase
      .from(GATEWAY_API_KEYS_TABLE)
      .select("*, owner:user_accounts(username, display_name)")
      .eq("owner_user_id", userId)
      .limit(1)
      .maybeSingle(),
    loadUsageMap(),
  ]);

  if (error) {
    if (!isMissingTableError(error, GATEWAY_API_KEYS_TABLE)) {
      console.error("Failed to load user gateway api key:", error);
    }
    return null;
  }

  if (!data) {
    return null;
  }

  return toSummary(data as GatewayApiKeyRow & {owner?: GatewayApiKeyOwnerSelect}, usageMap);
}

export async function ensureUserGatewayApiKey(input: {
  userId: string;
  username: string;
  displayName?: string | null;
}) {
  const existing = await loadUserGatewayApiKey(input.userId);
  if (existing) {
    return existing;
  }

  const created = await createGatewayApiKey({
    key_name: input.username.trim(),
    description: `${input.displayName?.trim() || input.username.trim()} 的个人访问 key`,
    is_enabled: true,
    owner_user_id: input.userId,
    key_scope: "user",
  });

  return created.summary;
}

export async function rotateUserGatewayApiKey(input: {
  userId: string;
  username: string;
  displayName?: string | null;
}) {
  const supabase = createAdminClient();
  const current = await loadUserGatewayApiKey(input.userId);
  const rawKey = buildRawGatewayApiKey();

  if (!current) {
    const created = await createGatewayApiKey({
      key_name: input.username.trim(),
      description: `${input.displayName?.trim() || input.username.trim()} 的个人访问 key`,
      is_enabled: true,
      owner_user_id: input.userId,
      key_scope: "user",
    });
    return created.summary;
  }

  const {error} = await supabase
    .from(GATEWAY_API_KEYS_TABLE)
    .update({
      key_name: input.username.trim(),
      description: `${input.displayName?.trim() || input.username.trim()} 的个人访问 key`,
      key_prefix: buildKeyPrefix(rawKey),
      secret_hash: sha256Hex(rawKey),
      encrypted_key: encryptGatewayKey(rawKey),
      key_scope: "user",
      is_enabled: true,
      owner_user_id: input.userId,
    })
    .eq("id", current.id);

  if (error) {
    throw new Error(`重置用户访问密钥失败: ${error.message}`);
  }

  const refreshed = await loadUserGatewayApiKey(input.userId);
  if (!refreshed) {
    throw new Error("重置用户访问密钥后读取失败");
  }

  return {
    ...refreshed,
    raw_key: rawKey,
  };
}
