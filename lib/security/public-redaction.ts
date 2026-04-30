const REDACTED_ENDPOINT = "[protected]";

export function redactPublicEndpoint(value: string | null | undefined) {
  void value;
  return REDACTED_ENDPOINT;
}
