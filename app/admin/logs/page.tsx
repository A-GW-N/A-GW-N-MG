import type {Metadata} from "next";

import {AdminLoginPanel} from "@/components/admin/admin-login-panel";
import {AdminLogsHome} from "@/components/admin/admin-logs-home";
import {isAdminAuthenticated, isAdminPasswordConfigured} from "@/lib/admin/auth";
import {countAdminGatewayRequestLogs} from "@/lib/database/admin-logs";
import {countAdminAuthEventLogs} from "@/lib/database/auth-logs";

export const metadata: Metadata = {
  title: "Admin Logs",
  description: "A-GW-N 管理日志分类页。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLogsRoutePage() {
  const isProtected = isAdminPasswordConfigured();
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginPanel mode={isProtected ? "password" : "oauth-admin"} />;
  }

  const [requestStats, authStats] = await Promise.all([
    countAdminGatewayRequestLogs(),
    countAdminAuthEventLogs(),
  ]);

  return (
    <AdminLogsHome
      isProtected={isProtected}
      categories={[
        {
          href: "/admin/logs/request",
          label: "Gateway",
          title: "请求日志",
          description: "查看网关模型请求、状态码、token、来源头和 metadata 等详细字段。",
          total: requestStats.total,
          success: requestStats.success,
          icon: "request",
        },
        {
          href: "/admin/logs/auth",
          label: "Authentication",
          title: "登录认证日志",
          description: "查看用户登录、管理员进入、退出登录、权限拒绝、邀请码流程等认证相关事件。",
          total: authStats.total,
          success: authStats.success,
          icon: "auth",
        },
      ]}
    />
  );
}
