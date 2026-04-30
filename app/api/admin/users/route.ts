import {NextResponse} from "next/server";

import {isAdminAuthenticated} from "@/lib/admin/auth";
import {
  deleteAdminUserAccount,
  loadAdminUserAccounts,
  saveAdminUserAccounts,
  type UserAccountInput,
} from "@/lib/database/user-accounts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  const users = await loadAdminUserAccounts();
  return NextResponse.json({users});
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = await request.json();
    const users = Array.isArray(body?.users) ? (body.users as UserAccountInput[]) : [];
    const savedUsers = await saveAdminUserAccounts(users);
    return NextResponse.json({users: savedUsers});
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存用户账户失败";
    return NextResponse.json({message}, {status: 500});
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = await request.json();
    const users = await deleteAdminUserAccount(typeof body?.id === "string" ? body.id : "");
    return NextResponse.json({users, message: "用户已删除"});
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除用户失败";
    return NextResponse.json({message}, {status: 500});
  }
}
