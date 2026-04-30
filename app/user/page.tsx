import type {Metadata} from "next";

import {UserLoginPanel} from "@/components/user/user-login-panel";
import {loadUserRegistrationSettings} from "@/lib/database/user-registration";
import {UserPage} from "@/components/user/user-page";
import {loadUserPortalData} from "@/lib/database/user-portal";
import {getAuthenticatedUser} from "@/lib/user/auth";

export const metadata: Metadata = {
  title: "User",
  description: "A-GW-N 用户个人主页框架。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UserRoutePage({
  searchParams,
}: {
  searchParams?: Promise<{error?: string}>;
}) {
  const user = await getAuthenticatedUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";

  if (!user) {
    const registrationSettings = await loadUserRegistrationSettings();
    return (
      <UserLoginPanel
        errorMessage={errorMessage}
        registrationMode={registrationSettings.registration_mode}
        inviteCodeHint={registrationSettings.invite_code_hint ?? ""}
      />
    );
  }

  const portalData = await loadUserPortalData(user.id);
  return <UserPage user={user} portalData={portalData} />;
}
