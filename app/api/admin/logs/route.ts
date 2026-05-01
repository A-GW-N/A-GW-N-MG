import {NextResponse} from "next/server";

import {isAdminAuthenticated} from "@/lib/admin/auth";
import {loadAdminGatewayRequestLogs} from "@/lib/database/admin-logs";
import {loadAdminAuthEventLogs} from "@/lib/database/auth-logs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  const requestUrl = new URL(request.url);
  const limit = Number(requestUrl.searchParams.get("limit") ?? "200");
  const normalizedLimit =
    Number.isFinite(limit) ? Math.max(1, Math.min(500, limit)) : 200
  ;
  const category = requestUrl.searchParams.get("category")?.trim() ?? "request";

  if (category === "auth") {
    const logs = await loadAdminAuthEventLogs(normalizedLimit);
    return NextResponse.json({category, logs});
  }

  const logs = await loadAdminGatewayRequestLogs(normalizedLimit);

  return NextResponse.json({category: "request", logs});
}
