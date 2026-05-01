import "server-only";

function readForwardedValue(value: string | null | undefined) {
  return value?.split(",")[0]?.trim() ?? "";
}

function buildForwardedOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = readForwardedValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || request.headers.get("host")?.trim() || requestUrl.host;
  const forwardedProto = readForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");

  if (!host || !protocol) {
    return requestUrl.origin;
  }

  return `${protocol}://${host}`;
}

export function getAppOrigin(request: Request) {
  const explicitOrigin = process.env.APP_BASE_URL?.trim();
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, "");
  }

  return buildForwardedOrigin(request);
}

export function buildAppUrl(request: Request, pathname: string) {
  return new URL(pathname, `${getAppOrigin(request)}/`);
}
