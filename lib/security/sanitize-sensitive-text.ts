const URL_PATTERN = /\bhttps?:\/\/[^\s)]+/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._\-~+/=]+\b/gi;
const SK_PATTERN = /\bsk-[A-Za-z0-9._\-]+\b/gi;

export function sanitizeSensitiveText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(SK_PATTERN, "sk-[redacted]")
    .replace(URL_PATTERN, "[redacted-url]");
}
