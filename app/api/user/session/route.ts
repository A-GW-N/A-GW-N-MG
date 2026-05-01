import {NextResponse} from "next/server";
import {cookies} from "next/headers";

import {
  USER_SESSION_COOKIE,
  clearUserSession,
  getAuthenticatedUser,
} from "@/lib/user/auth";
import {recordAuthEvent} from "@/lib/database/auth-logs";

export async function POST() {
  return NextResponse.json(
    {message: "当前用户登录已切换为 Linux.do OAuth2，请使用 OAuth 登录入口"},
    {status: 405}
  );
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value ?? "";
  const user = await getAuthenticatedUser();

  if (token) {
    await clearUserSession(token);
  }

  cookieStore.delete(USER_SESSION_COOKIE);

  await recordAuthEvent(
    {
      category: "logout",
      event_type: "user_logout",
      success: true,
      auth_scope: "user",
      actor_user_id: user?.id ?? null,
      actor_username: user?.username ?? null,
      actor_display_name: user?.display_name ?? null,
      actor_role: user?.role ?? null,
      target_path: "/user",
      message: "用户退出登录",
      metadata: {
        had_session_token: Boolean(token),
        session_cookie_cleared: true,
      },
    }
    ,
    {request}
  );

  return NextResponse.json({message: "已退出登录"});
}
