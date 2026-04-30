import {NextResponse} from "next/server";
import {cookies} from "next/headers";

import {
  USER_SESSION_COOKIE,
  clearUserSession,
} from "@/lib/user/auth";

export async function POST() {
  return NextResponse.json(
    {message: "当前用户登录已切换为 Linux.do OAuth2，请使用 OAuth 登录入口"},
    {status: 405}
  );
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value ?? "";

  if (token) {
    await clearUserSession(token);
  }

  cookieStore.delete(USER_SESSION_COOKIE);
  return NextResponse.json({message: "已退出登录"});
}
