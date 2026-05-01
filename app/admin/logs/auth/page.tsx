import type {Metadata} from "next";

import {AdminLoginPanel} from "@/components/admin/admin-login-panel";
import {AdminAuthLogsPage} from "@/components/admin/admin-auth-logs-page";
import {isAdminAuthenticated, isAdminPasswordConfigured} from "@/lib/admin/auth";
import {loadAdminAuthEventLogs} from "@/lib/database/auth-logs";

export const metadata: Metadata = {
  title: "Admin Auth Logs",
  description: "A-GW-N 认证登录日志页。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAuthLogsRoutePage() {
  const isProtected = isAdminPasswordConfigured();
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginPanel mode={isProtected ? "password" : "oauth-admin"} />;
  }

  const logs = await loadAdminAuthEventLogs();
  return <AdminAuthLogsPage logs={logs} isProtected={isProtected} />;
}
