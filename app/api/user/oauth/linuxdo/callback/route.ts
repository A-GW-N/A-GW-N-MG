import {NextResponse} from "next/server";
import {cookies} from "next/headers";

import {ensureUserGatewayApiKey} from "@/lib/database/gateway-api-keys";
import {findUserAccountForOAuthIdentity, upsertOAuthUserAccount} from "@/lib/database/user-accounts";
import {
  loadUserRegistrationSettings,
} from "@/lib/database/user-registration";
import {resetGatewayApiKeyAuthCache} from "@/lib/gateway/request-auth";
import {
  USER_OAUTH_PENDING_PROFILE_COOKIE,
  USER_OAUTH_PENDING_REDIRECT_COOKIE,
  USER_OAUTH_PENDING_TOKEN_COOKIE,
  USER_OAUTH_REDIRECT_COOKIE,
  USER_OAUTH_STATE_COOKIE,
  exchangeLinuxdoCode,
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

function redirectWithError(request: Request, redirectTo: string, message: string) {
  const url = buildAppUrl(request, sanitizeUserRedirectPath(redirectTo));
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete(USER_OAUTH_STATE_COOKIE);
  response.cookies.delete(USER_OAUTH_REDIRECT_COOKIE);
  response.cookies.delete(USER_OAUTH_PENDING_TOKEN_COOKIE);
  response.cookies.delete(USER_OAUTH_PENDING_PROFILE_COOKIE);
  response.cookies.delete(USER_OAUTH_PENDING_REDIRECT_COOKIE);
  return response;
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim() ?? "";
  const state = requestUrl.searchParams.get("state")?.trim() ?? "";
  const oauthError = requestUrl.searchParams.get("error")?.trim() ?? "";
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(USER_OAUTH_STATE_COOKIE)?.value ?? "";
  const redirectTo = sanitizeUserRedirectPath(
    cookieStore.get(USER_OAUTH_REDIRECT_COOKIE)?.value ?? "/user"
  );

  if (oauthError) {
    await recordAuthEvent(
      {
        category: "error",
        event_type: "linuxdo_oauth_callback_error",
        success: false,
        auth_scope: "user",
        provider: "linuxdo",
        target_path: redirectTo,
        message: oauthError,
        metadata: {
          phase: "callback",
          code_present: Boolean(code),
          state_present: Boolean(state),
          expected_state_present: Boolean(expectedState),
        },
      },
      {request}
    );
    return redirectWithError(request, redirectTo, oauthError);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    await recordAuthEvent(
      {
        category: "error",
        event_type: "linuxdo_oauth_state_invalid",
        success: false,
        auth_scope: "user",
        provider: "linuxdo",
        target_path: redirectTo,
        message: "OAuth 回调校验失败",
        metadata: {
          code_present: Boolean(code),
          state_present: Boolean(state),
          expected_state_present: Boolean(expectedState),
        },
      },
      {request}
    );
    return redirectWithError(request, redirectTo, "OAuth 回调校验失败");
  }

  try {
    const accessToken = await exchangeLinuxdoCode(code);
    const rawProfile = await fetchLinuxdoProfile(accessToken);
    const profile = normalizeLinuxdoProfile(rawProfile);
    const [existingUser, registrationSettings] = await Promise.all([
      findUserAccountForOAuthIdentity({
        provider: "linuxdo",
        subject: profile.subject,
        username: profile.username,
      }),
      loadUserRegistrationSettings(),
    ]);

    if (!existingUser) {
      if (registrationSettings.registration_mode === "closed") {
        await recordAuthEvent(
          {
            category: "login",
            event_type: "linuxdo_oauth_registration_closed",
            success: false,
            auth_scope: "user",
            provider: "linuxdo",
            actor_username: profile.username,
            actor_display_name: profile.displayName,
            target_path: redirectTo,
            message: "未开启注册",
            metadata: {
              registration_mode: registrationSettings.registration_mode,
              oauth_subject: profile.subject,
            },
          },
          {request}
        );
        return redirectWithError(request, redirectTo, "未开启注册");
      }

      if (registrationSettings.registration_mode === "invite_only") {
        await recordAuthEvent(
          {
            category: "access",
            event_type: "linuxdo_oauth_invite_required",
            success: true,
            auth_scope: "user",
            provider: "linuxdo",
            actor_username: profile.username,
            actor_display_name: profile.displayName,
            target_path: "/user/invite",
            message: "需要邀请码继续注册",
            metadata: {
              registration_mode: registrationSettings.registration_mode,
              redirect_to: redirectTo,
              oauth_subject: profile.subject,
            },
          },
          {request}
        );
        const response = NextResponse.redirect(buildAppUrl(request, "/user/invite"));
        response.cookies.delete(USER_OAUTH_STATE_COOKIE);
        response.cookies.delete(USER_OAUTH_REDIRECT_COOKIE);
        response.cookies.set(USER_OAUTH_PENDING_TOKEN_COOKIE, accessToken, buildCookieOptions());
        response.cookies.set(
          USER_OAUTH_PENDING_PROFILE_COOKIE,
          encodeURIComponent(
            JSON.stringify({
              subject: profile.subject,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            })
          ),
          buildCookieOptions()
        );
        response.cookies.set(USER_OAUTH_PENDING_REDIRECT_COOKIE, redirectTo, buildCookieOptions());
        return response;
      }
    }

    const user = await upsertOAuthUserAccount({
      provider: "linuxdo",
      subject: profile.subject,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      profileRaw: profile.profileRaw,
    });

    await ensureUserGatewayApiKey({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    });
    resetGatewayApiKeyAuthCache();

    const session = await createUserSession(user.id);
    const response = NextResponse.redirect(buildAppUrl(request, redirectTo));
    response.cookies.delete(USER_OAUTH_STATE_COOKIE);
    response.cookies.delete(USER_OAUTH_REDIRECT_COOKIE);
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
        event_type: "linuxdo_oauth_login",
        success: true,
        auth_scope: "user",
        actor_user_id: user.id,
        actor_username: user.username,
        actor_display_name: user.display_name,
        actor_role: user.role,
        provider: "linuxdo",
        target_path: redirectTo,
        message: "Linux.do 登录成功",
        metadata: {
          redirect_to: redirectTo,
          oauth_subject: profile.subject,
          oauth_username: profile.username,
          user_created: !existingUser,
        },
      },
      {request}
    );

    return response;
  } catch (error) {
    const message = toPublicUserAuthErrorMessage(error, "Linux.do 登录失败");
    await recordAuthEvent(
      {
        category: "error",
        event_type: "linuxdo_oauth_login_failed",
        success: false,
        auth_scope: "user",
        provider: "linuxdo",
        target_path: redirectTo,
        message,
        metadata: {
          code_present: Boolean(code),
          state_present: Boolean(state),
        },
      },
      {request}
    );
    return redirectWithError(request, redirectTo, message);
  }
}
