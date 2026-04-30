import {NextResponse} from "next/server";

import {isAdminAuthenticated} from "@/lib/admin/auth";
import {
  createGatewayApiKey,
  deleteGatewayApiKey,
  loadGatewayApiKeys,
  updateGatewayApiKey,
} from "@/lib/database/gateway-api-keys";
import {resetGatewayApiKeyAuthCache} from "@/lib/gateway/request-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return jsonNoStore({message: "未登录管理界面"}, {status: 401});
  }

  const keys = await loadGatewayApiKeys();
  return jsonNoStore({keys});
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return jsonNoStore({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = (await request.json()) as {
      key_name?: string;
      description?: string | null;
      is_enabled?: boolean;
    };

    const created = await createGatewayApiKey({
      key_name: body.key_name ?? "",
      description: body.description,
      is_enabled: body.is_enabled,
    });
    resetGatewayApiKeyAuthCache();

    return jsonNoStore(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建访问密钥失败";
    return jsonNoStore({message}, {status: 500});
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return jsonNoStore({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      key_name?: string;
      description?: string | null;
      is_enabled?: boolean;
    };

    const keys = await updateGatewayApiKey({
      id: body.id ?? "",
      key_name: body.key_name ?? "",
      description: body.description,
      is_enabled: Boolean(body.is_enabled),
    });
    resetGatewayApiKeyAuthCache();

    return jsonNoStore({keys});
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新访问密钥失败";
    return jsonNoStore({message}, {status: 500});
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return jsonNoStore({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = (await request.json()) as {id?: string};
    const keys = await deleteGatewayApiKey(body.id ?? "");
    resetGatewayApiKeyAuthCache();
    return jsonNoStore({keys});
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除访问密钥失败";
    return jsonNoStore({message}, {status: 500});
  }
}
