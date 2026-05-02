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
import {recordAuthEvent} from "@/lib/database/auth-logs";
import {buildAppUrl} from "@/lib/utils/request-url";

function redirectWithError(request: Request, message: string) {
  const url = buildAppUrl(request, "/user/invite");
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
    await recordAuthEvent(
      {
        category: "error",
        event_type: "invite_registration_session_missing",
        success: false,
        auth_scope: "user",
        provider: "linuxdo",
        target_path: "/user/invite",
        message: "邀请码会话已失效，请重新登录",
        metadata: {
          redirect_to: redirectTo,
          has_pending_profile_cookie: Boolean(
            cookieStore.get(USER_OAUTH_PENDING_PROFILE_COOKIE)?.value
          ),
        },
      },
      {request}
    );
    const response = NextResponse.redirect(
      buildAppUrl(request, "/user?error=邀请码会话已失效，请重新登录")
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
      await recordAuthEvent(
        {
          category: "login",
          event_type: "invite_registration_code_missing",
          success: false,
          auth_scope: "user",
          provider: "linuxdo",
          target_path: "/user/invite",
          message: "请输入邀请码",
          metadata: {
            redirect_to: redirectTo,
          },
        },
        {request}
      );
      return redirectWithError(request, "请输入邀请码");
    }

    const invite = await findAvailableUserInviteCode(inviteCode);
    if (!invite) {
      await recordAuthEvent(
        {
          category: "login",
          event_type: "invite_registration_code_invalid",
          success: false,
          auth_scope: "user",
          provider: "linuxdo",
          target_path: "/user/invite",
          message: "邀请码无效或已失效",
          metadata: {
            redirect_to: redirectTo,
            invite_code_preview: inviteCode.slice(0, 3),
          },
        },
        {request}
      );
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
    const response = NextResponse.redirect(buildAppUrl(request, redirectTo));
    response.cookies.delete(USER_OAUTH_PENDING_TOKEN_COOKIE);
    response.cookies.delete(USER_OAUTH_PENDING_PROFILE_COOKIE);
    response.cookies.delete(USER_OAUTH_PENDING_REDIRECT_COOKIE);
    response.cookies.set(
      USER_SESSION_COOKIE,
      session.token,
      getUserSessionCookieOptions(session.expiresAt)
    );

    await recordAuthEvent(
      {
        category: "login",
        event_type: "invite_registration_completed",
        success: true,
        auth_scope: "user",
        actor_user_id: user.id,
        actor_username: user.username,
        actor_display_name: user.display_name,
        actor_role: user.role,
        provider: "linuxdo",
        target_path: redirectTo,
        message: "邀请码注册并登录成功",
        metadata: {
          redirect_to: redirectTo,
          oauth_subject: profile.subject,
          oauth_username: profile.username,
          linuxdo_trust_level: profile.trustLevel,
          linuxdo_active: profile.active,
          linuxdo_silenced: profile.silenced,
          invite_code_preview: inviteCode.slice(0, 3),
          reused_existing_user: Boolean(existingUser),
        },
      },
      {request}
    );

    return response;
  } catch (error) {
    const message = toPublicUserAuthErrorMessage(error, "邀请码注册失败");
    await recordAuthEvent(
      {
        category: "error",
        event_type: "invite_registration_failed",
        success: false,
        auth_scope: "user",
        provider: "linuxdo",
        target_path: "/user/invite",
        message,
        metadata: {
          redirect_to: redirectTo,
        },
      },
      {request}
    );
    return redirectWithError(request, message);
  }
}
