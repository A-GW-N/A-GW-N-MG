import {NextResponse} from "next/server";
import {getAuthenticatedUser} from "@/lib/user/auth";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookieValue,
  getAdminSessionCookieOptions,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sanitizeRedirect(value: string | null | undefined) {
  const target = value?.trim() ?? "/admin";
  if (!target.startsWith("/") || target.startsWith("//")) {
    return "/admin";
  }
  return target;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectTo = sanitizeRedirect(requestUrl.searchParams.get("redirect"));
  const user = await getAuthenticatedUser();

  if (user?.is_active && user.role?.trim().toLowerCase() === "admin") {
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    if (isAdminPasswordConfigured()) {
      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        createAdminSessionCookieValue(),
        getAdminSessionCookieOptions()
      );
    }

    return response;
  }

  return NextResponse.redirect(new URL("/user?error=当前账号无管理员权限", request.url));
}

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      {message: "未配置管理密码，请先使用管理员用户登录后再进入管理页面"},
      {status: 403}
    );
  }

  const body = (await request.json().catch(() => null)) as {password?: string} | null;
  const password = body?.password?.trim() ?? "";

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({message: "密码错误"}, {status: 401});
  }

  const response = NextResponse.json({message: "登录成功"});
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionCookieValue(),
    getAdminSessionCookieOptions()
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({message: "已退出管理界面"});
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
