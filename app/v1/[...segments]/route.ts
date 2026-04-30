import {NextResponse} from "next/server";

import {validateGatewayApiKey} from "@/lib/gateway/request-auth";

const GO_PROXY_BASE_URL = process.env.GO_PROXY_BASE_URL?.trim() || "http://127.0.0.1:8081";

async function proxyToGo(request: Request, segments: string[]) {
  const auth = await validateGatewayApiKey(request.headers);
  if (!auth.ok) {
    return NextResponse.json({error: auth.error}, {status: auth.status});
  }

  const pathname = segments.join("/");
  const targetURL = new URL(`/v1/${pathname}`, GO_PROXY_BASE_URL);
  targetURL.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", new URL(request.url).host);
  headers.set("x-forwarded-proto", new URL(request.url).protocol.replace(":", ""));
  headers.set("x-agwn-gateway-key-name", auth.name ?? "");
  headers.set("x-agwn-gateway-key-prefix", auth.prefix ?? "");
  headers.set("x-agwn-gateway-key-id", auth.id ?? "");
  headers.set("x-agwn-user-id", auth.ownerUserId ?? "");

  const response = await fetch(targetURL, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(
  request: Request,
  {params}: {params: Promise<{segments: string[]}>}
) {
  const resolved = await params;
  return proxyToGo(request, resolved.segments);
}

export async function POST(
  request: Request,
  {params}: {params: Promise<{segments: string[]}>}
) {
  const resolved = await params;
  return proxyToGo(request, resolved.segments);
}

export async function PUT(
  request: Request,
  {params}: {params: Promise<{segments: string[]}>}
) {
  const resolved = await params;
  return proxyToGo(request, resolved.segments);
}

export async function PATCH(
  request: Request,
  {params}: {params: Promise<{segments: string[]}>}
) {
  const resolved = await params;
  return proxyToGo(request, resolved.segments);
}

export async function DELETE(
  request: Request,
  {params}: {params: Promise<{segments: string[]}>}
) {
  const resolved = await params;
  return proxyToGo(request, resolved.segments);
}
