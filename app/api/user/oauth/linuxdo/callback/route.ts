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

function redirectWithError(request: Request, redirectTo: string, message: string) {
  const url = new URL(sanitizeUserRedirectPath(redirectTo), request.url);
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
    return redirectWithError(request, redirectTo, oauthError);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
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
        return redirectWithError(request, redirectTo, "未开启注册");
      }

      if (registrationSettings.registration_mode === "invite_only") {
        const response = NextResponse.redirect(new URL("/user/invite", request.url));
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
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
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

    return response;
  } catch (error) {
    const message = toPublicUserAuthErrorMessage(error, "Linux.do 登录失败");
    return redirectWithError(request, redirectTo, message);
  }
}
