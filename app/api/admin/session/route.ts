import {NextResponse} from "next/server";
import {getAuthenticatedUser} from "@/lib/user/auth";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookieValue,
  getAdminSessionCookieOptions,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin/auth";
import {recordAuthEvent} from "@/lib/database/auth-logs";
import {buildAppUrl} from "@/lib/utils/request-url";

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
    const response = NextResponse.redirect(buildAppUrl(request, redirectTo));

    if (isAdminPasswordConfigured()) {
      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        createAdminSessionCookieValue(),
        getAdminSessionCookieOptions()
      );
    }

    await recordAuthEvent(
      {
        category: "login",
        event_type: "admin_oauth_entry",
        success: true,
        auth_scope: "admin",
        actor_user_id: user.id,
        actor_username: user.username,
        actor_display_name: user.display_name,
        actor_role: user.role,
        provider: user.auth_source ?? "user-session",
        target_path: redirectTo,
        message: "管理员经用户会话进入管理界面",
        metadata: {
          redirect_to: redirectTo,
          admin_password_configured: isAdminPasswordConfigured(),
        },
      },
      {request}
    );

    return response;
  }

  await recordAuthEvent(
    {
      category: "access",
      event_type: "admin_access_denied",
      success: false,
      auth_scope: "admin",
      target_path: redirectTo,
      message: "当前账号无管理员权限",
      metadata: {
        redirect_to: redirectTo,
        has_user_session: Boolean(user),
      },
    },
    {request}
  );

  return NextResponse.redirect(buildAppUrl(request, "/user?error=当前账号无管理员权限"));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {password?: string} | null;
  const password = body?.password?.trim() ?? "";

  if (!isAdminPasswordConfigured()) {
    await recordAuthEvent(
      {
        category: "access",
        event_type: "admin_password_not_configured",
        success: false,
        auth_scope: "admin",
        target_path: "/admin",
        message: "未配置管理密码，请先使用管理员用户登录后再进入管理页面",
        metadata: {
          password_present: Boolean(body?.password?.trim()),
        },
      },
      {request}
    );
    return NextResponse.json(
      {message: "未配置管理密码，请先使用管理员用户登录后再进入管理页面"},
      {status: 403}
    );
  }

  if (!verifyAdminPassword(password)) {
    await recordAuthEvent(
      {
        category: "login",
        event_type: "admin_password_login_failed",
        success: false,
        auth_scope: "admin",
        target_path: "/admin",
        message: "密码错误",
        metadata: {
          password_present: Boolean(password),
        },
      },
      {request}
    );
    return NextResponse.json({message: "密码错误"}, {status: 401});
  }

  const response = NextResponse.json({message: "登录成功"});
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionCookieValue(),
    getAdminSessionCookieOptions()
  );

  await recordAuthEvent(
    {
      category: "login",
      event_type: "admin_password_login",
      success: true,
      auth_scope: "admin",
      target_path: "/admin",
      message: "管理员密码登录成功",
      metadata: {
        password_present: Boolean(password),
      },
    },
    {request}
  );

  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({message: "已退出管理界面"});
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });

  await recordAuthEvent(
    {
      category: "logout",
      event_type: "admin_logout",
      success: true,
      auth_scope: "admin",
      target_path: "/admin",
      message: "管理员退出管理界面",
      metadata: {
        session_cookie_cleared: true,
      },
    },
    {request}
  );

  return response;
}
