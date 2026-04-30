import type {Metadata} from "next";

import {AdminLoginPanel} from "@/components/admin/admin-login-panel";
import {AdminPage} from "@/components/admin/admin-page";
import {isAdminAuthenticated, isAdminPasswordConfigured} from "@/lib/admin/auth";
import {loadHomepageContent} from "@/lib/database/homepage-content";
import {loadHomepageBlocks} from "@/lib/database/homepage-blocks";

export const metadata: Metadata = {
  title: "Admin",
  description: "A-GW-N 管理主页，用于管理首页方块和内容结构。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRoutePage() {
  const isProtected = isAdminPasswordConfigured();
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginPanel mode={isProtected ? "password" : "oauth-admin"} />;
  }

  const [blocks, infoPanel] = await Promise.all([
    loadHomepageBlocks(),
    loadHomepageContent(),
  ]);
  return (
    <AdminPage
      blocks={blocks}
      infoPanel={infoPanel}
      isPasswordProtected={isProtected}
    />
  );
}
