import {NextResponse} from "next/server";

import {
  USER_OAUTH_REDIRECT_COOKIE,
  USER_OAUTH_STATE_COOKIE,
  buildLinuxdoAuthorizationURL,
  createOAuthState,
  sanitizeUserRedirectPath,
  toPublicUserAuthErrorMessage,
} from "@/lib/user/linuxdo";
import {recordAuthEvent} from "@/lib/database/auth-logs";
import {buildAppUrl} from "@/lib/utils/request-url";

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
  try {
    const requestUrl = new URL(request.url);
    const redirectTo = sanitizeUserRedirectPath(requestUrl.searchParams.get("redirect"));
    const state = createOAuthState();

    const response = NextResponse.redirect(buildLinuxdoAuthorizationURL(state, request));
    response.cookies.set(USER_OAUTH_STATE_COOKIE, state, buildCookieOptions());
    response.cookies.set(USER_OAUTH_REDIRECT_COOKIE, redirectTo, buildCookieOptions());

    await recordAuthEvent(
      {
        category: "login",
        event_type: "linuxdo_oauth_start",
        success: true,
        auth_scope: "user",
        provider: "linuxdo",
        target_path: redirectTo,
        message: "Linux.do OAuth 登录流程开始",
        metadata: {
          redirect_to: redirectTo,
          state_issued: true,
          callback_url: buildAppUrl(request, "/api/user/oauth/linuxdo/callback").toString(),
        },
      },
      {request}
    );

    return response;
  } catch (error) {
    const message = toPublicUserAuthErrorMessage(error, "Linux.do 登录初始化失败");
    await recordAuthEvent(
      {
        category: "error",
        event_type: "linuxdo_oauth_start_failed",
        success: false,
        auth_scope: "user",
        provider: "linuxdo",
        target_path: "/user",
        message,
      },
      {request}
    );
    return NextResponse.redirect(buildAppUrl(request, `/user?error=${encodeURIComponent(message)}`));
  }
}
