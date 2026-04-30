import {NextResponse} from "next/server";

import {
  USER_OAUTH_REDIRECT_COOKIE,
  USER_OAUTH_STATE_COOKIE,
  buildLinuxdoAuthorizationURL,
  createOAuthState,
  sanitizeUserRedirectPath,
  toPublicUserAuthErrorMessage,
} from "@/lib/user/linuxdo";

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

    const response = NextResponse.redirect(buildLinuxdoAuthorizationURL(state));
    response.cookies.set(USER_OAUTH_STATE_COOKIE, state, buildCookieOptions());
    response.cookies.set(USER_OAUTH_REDIRECT_COOKIE, redirectTo, buildCookieOptions());

    return response;
  } catch (error) {
    const message = toPublicUserAuthErrorMessage(error, "Linux.do 登录初始化失败");
    return NextResponse.redirect(new URL(`/user?error=${encodeURIComponent(message)}`, request.url));
  }
}
