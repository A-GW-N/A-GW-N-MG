import type {Metadata} from "next";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";

import {UserInvitePanel} from "@/components/user/user-invite-panel";
import {getAuthenticatedUser} from "@/lib/user/auth";
import {USER_OAUTH_PENDING_PROFILE_COOKIE} from "@/lib/user/linuxdo";

export const metadata: Metadata = {
  title: "Invite Registration",
  description: "A-GW-N 用户邀请码注册页。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parsePendingProfile(raw: string | undefined) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(raw)) as {
      username?: string;
      displayName?: string;
    };
  } catch {
    return null;
  }
}

export default async function UserInviteRoutePage({
  searchParams,
}: {
  searchParams?: Promise<{error?: string}>;
}) {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/user");
  }

  const cookieStore = await cookies();
  const pendingProfile = parsePendingProfile(
    cookieStore.get(USER_OAUTH_PENDING_PROFILE_COOKIE)?.value
  );

  if (!pendingProfile) {
    redirect("/user");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";

  return (
    <UserInvitePanel
      errorMessage={errorMessage}
      username={pendingProfile.username}
      displayName={pendingProfile.displayName}
    />
  );
}
