import "server-only";

import {createHash, timingSafeEqual} from "node:crypto";

import {
  loadGatewayApiKeyAuthRecords,
  touchGatewayApiKeyUsage,
  type GatewayApiKeyAuthRecord,
} from "@/lib/database/gateway-api-keys";

const KEY_ENV_NAMES = ["GATEWAY_API_KEYS", "GATEWAY_ACCESS_KEYS"] as const;
const AUTH_CACHE_TTL_MS = 15_000;

interface CachedGatewayApiKeyRecords {
  expiresAt: number;
  records: GatewayApiKeyAuthRecord[];
}

let authCache: CachedGatewayApiKeyRecords | null = null;

export function resetGatewayApiKeyAuthCache() {
  authCache = null;
}

function parseConfiguredKeys() {
  const values = KEY_ENV_NAMES
    .map((name) => process.env[name]?.trim() ?? "")
    .filter(Boolean);

  const keys = values
    .flatMap((value) => value.split(/[,\r\n]+/))
    .map((value) => value.trim())
    .filter((value) => value.startsWith("sk-"));

  return [...new Set(keys)];
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildKeyPrefix(rawKey: string) {
  return rawKey.length <= 12 ? rawKey : `${rawKey.slice(0, 12)}...`;
}

function extractBearerToken(value: string) {
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

async function loadCachedGatewayApiKeyRecords() {
  const now = Date.now();
  if (authCache && now < authCache.expiresAt) {
    return authCache.records;
  }

  const records = await loadGatewayApiKeyAuthRecords();
  authCache = {
    records,
    expiresAt: now + AUTH_CACHE_TTL_MS,
  };

  return records;
}

export function extractGatewayApiKey(headers: Headers) {
  const authorization = headers.get("authorization")?.trim() ?? "";
  const bearerToken = authorization ? extractBearerToken(authorization) : "";

  if (bearerToken) {
    return bearerToken;
  }

  return headers.get("x-api-key")?.trim() ?? "";
}

export async function validateGatewayApiKey(headers: Headers) {
  const providedKey = extractGatewayApiKey(headers);
  const envKeys = parseConfiguredKeys();
  const dbRecords = await loadCachedGatewayApiKeyRecords();

  if (dbRecords.length === 0 && envKeys.length === 0) {
    return {
      ok: false as const,
      status: 503,
      error: "gateway api keys are not configured",
    };
  }

  if (!providedKey || !providedKey.startsWith("sk-")) {
    return {
      ok: false as const,
      status: 401,
      error: "missing or invalid api key",
    };
  }

  const providedHash = sha256Hex(providedKey);
  const providedHashBuffer = Buffer.from(providedHash);
  const matchedRecord = dbRecords.find((record) => {
    const expectedBuffer = Buffer.from(record.secret_hash);
    return (
      expectedBuffer.length === providedHashBuffer.length &&
      timingSafeEqual(expectedBuffer, providedHashBuffer)
    );
  });

  if (matchedRecord) {
    return {
      ok: true as const,
      key: providedKey,
      source: "db" as const,
      id: matchedRecord.id,
      name: matchedRecord.key_name,
      prefix: matchedRecord.key_prefix,
      ownerUserId: matchedRecord.owner_user_id,
    };
  }

  const providedBuffer = Buffer.from(providedKey);
  const matchedEnvKey = envKeys.find((expectedKey) => {
    const expectedBuffer = Buffer.from(expectedKey);
    return (
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer)
    );
  });

  if (matchedEnvKey) {
    return {
      ok: true as const,
      key: providedKey,
      source: "env" as const,
      id: null,
      name: "Environment Fallback",
      prefix: buildKeyPrefix(matchedEnvKey),
      ownerUserId: null,
    };
  }

  return {
    ok: false as const,
    status: 401,
    error: "invalid api key",
  };
}

export async function markGatewayApiKeyUsed(keyId: string | null, requestId: string) {
  if (!keyId) {
    return;
  }

  await touchGatewayApiKeyUsage(keyId, requestId);
}
