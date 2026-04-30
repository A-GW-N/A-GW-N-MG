import {NextResponse} from "next/server";
import {cookies} from "next/headers";

import {ensureUserGatewayApiKey} from "@/lib/database/gateway-api-keys";
import {findUserAccountForOAuthIdentity, upsertOAuthUserAccount} from "@/lib/database/user-accounts";
import {consumeUserInviteCode, findAvailableUserInviteCode} from "@/lib/database/user-registration";
import {resetGatewayApiKeyAuthCache} from "@/lib/gateway/request-auth";
import {
  USER_OAUTH_PENDING_PROFILE_COOKIE,
  USER_OAUTH_PENDING_REDIRECT_COOKIE,
  USER_OAUTH_PENDING_TOKEN_COOKIE,
  fetchLinuxdoProfile,
  normalizeLinuxdoProfile,
  sanitizeUserRedirectPath,
  toPublicUserAuthErrorMessage,
} from "@/lib/user/linuxdo";
import {
  USER_SESSION_COOKIE,
  createUserSession,
  getUserSessionCookieOptions,
} from "@/lib/user/auth";

function redirectWithError(request: Request, message: string) {
  const url = new URL("/user/invite", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const pendingToken = cookieStore.get(USER_OAUTH_PENDING_TOKEN_COOKIE)?.value ?? "";
  const redirectTo = sanitizeUserRedirectPath(
    cookieStore.get(USER_OAUTH_PENDING_REDIRECT_COOKIE)?.value ?? "/user"
  );

  if (!pendingToken) {
    const response = NextResponse.redirect(
      new URL("/user?error=邀请码会话已失效，请重新登录", request.url)
    );
    response.cookies.delete(USER_OAUTH_PENDING_TOKEN_COOKIE);
    response.cookies.delete(USER_OAUTH_PENDING_PROFILE_COOKIE);
    response.cookies.delete(USER_OAUTH_PENDING_REDIRECT_COOKIE);
    return response;
  }

  try {
    const formData = await request.formData();
    const inviteCode = String(formData.get("invite_code") ?? "").trim();

    if (!inviteCode) {
      return redirectWithError(request, "请输入邀请码");
    }

    const invite = await findAvailableUserInviteCode(inviteCode);
    if (!invite) {
      return redirectWithError(request, "邀请码无效或已失效");
    }

    const rawProfile = await fetchLinuxdoProfile(pendingToken);
    const profile = normalizeLinuxdoProfile(rawProfile);
    const existingUser = await findUserAccountForOAuthIdentity({
      provider: "linuxdo",
      subject: profile.subject,
      username: profile.username,
    });

    const user = existingUser ?? await upsertOAuthUserAccount({
      provider: "linuxdo",
      subject: profile.subject,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      profileRaw: profile.profileRaw,
    });

    if (!existingUser) {
      await consumeUserInviteCode(invite.id, user.id);
    }

    await ensureUserGatewayApiKey({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    });
    resetGatewayApiKeyAuthCache();

    const session = await createUserSession(user.id);
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.delete(USER_OAUTH_PENDING_TOKEN_COOKIE);
    response.cookies.delete(USER_OAUTH_PENDING_PROFILE_COOKIE);
    response.cookies.delete(USER_OAUTH_PENDING_REDIRECT_COOKIE);
    response.cookies.set(
      USER_SESSION_COOKIE,
      session.token,
      getUserSessionCookieOptions(session.expiresAt)
    );

    return response;
  } catch (error) {
    const message = toPublicUserAuthErrorMessage(error, "邀请码注册失败");
    return redirectWithError(request, message);
  }
}
