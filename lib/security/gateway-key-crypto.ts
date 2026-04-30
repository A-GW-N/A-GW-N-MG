import "server-only";

import {createHash, createCipheriv, createDecipheriv, randomBytes} from "node:crypto";

const ENCRYPTION_ENV_NAMES = [
  "GATEWAY_KEY_ENCRYPTION_SECRET",
  "USER_KEY_ENCRYPTION_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function getEncryptionSecret() {
  for (const envName of ENCRYPTION_ENV_NAMES) {
    const value = process.env[envName]?.trim() ?? "";
    if (value) {
      return value;
    }
  }

  throw new Error("缺少网关 key 加密密钥，请配置 GATEWAY_KEY_ENCRYPTION_SECRET");
}

function getEncryptionKey() {
  return createHash("sha256").update(getEncryptionSecret()).digest();
}

export function encryptGatewayKey(rawKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(rawKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

export function decryptGatewayKey(encryptedKey: string | null | undefined) {
  if (!encryptedKey) {
    return null;
  }

  try {
    const payload = Buffer.from(encryptedKey, "base64url");
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const ciphertext = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);

    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
