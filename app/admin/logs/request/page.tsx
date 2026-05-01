import type {Metadata} from "next";

import {AdminLoginPanel} from "@/components/admin/admin-login-panel";
import {AdminRequestLogsPage} from "@/components/admin/admin-request-logs-page";
import {isAdminAuthenticated, isAdminPasswordConfigured} from "@/lib/admin/auth";
import {loadAdminGatewayRequestLogs} from "@/lib/database/admin-logs";

export const metadata: Metadata = {
  title: "Admin Request Logs",
  description: "A-GW-N 请求日志页。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRequestLogsRoutePage() {
  const isProtected = isAdminPasswordConfigured();
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginPanel mode={isProtected ? "password" : "oauth-admin"} />;
  }

  const logs = await loadAdminGatewayRequestLogs();
  return <AdminRequestLogsPage logs={logs} isProtected={isProtected} />;
}
