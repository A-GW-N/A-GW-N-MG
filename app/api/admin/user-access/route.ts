import {NextResponse} from "next/server";

import {isAdminAuthenticated} from "@/lib/admin/auth";
import {
  createUserInviteCode,
  deleteUserInviteCode,
  loadUserInviteCodes,
  loadUserRegistrationSettings,
  saveUserRegistrationSettings,
  type RegistrationMode,
} from "@/lib/database/user-registration";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  const [settings, inviteCodes] = await Promise.all([
    loadUserRegistrationSettings(),
    loadUserInviteCodes(),
  ]);

  return NextResponse.json({settings, inviteCodes});
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = await request.json();
    const settings = await saveUserRegistrationSettings({
      registration_mode: (body?.registration_mode as RegistrationMode) ?? "closed",
      invite_code_hint: typeof body?.invite_code_hint === "string" ? body.invite_code_hint : "",
    });

    return NextResponse.json({settings, message: "注册设置已保存"});
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存注册设置失败";
    return NextResponse.json({message}, {status: 500});
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = await request.json().catch(() => ({}));
    const inviteCodes = await createUserInviteCode({
      code: typeof body?.code === "string" ? body.code : "",
      note: typeof body?.note === "string" ? body.note : "",
      expires_at: typeof body?.expires_at === "string" ? body.expires_at : "",
    });

    return NextResponse.json({inviteCodes, message: "邀请码已创建"});
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建邀请码失败";
    return NextResponse.json({message}, {status: 500});
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = await request.json();
    const inviteCodes = await deleteUserInviteCode(typeof body?.id === "string" ? body.id : "");
    return NextResponse.json({inviteCodes, message: "邀请码已删除"});
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除邀请码失败";
    return NextResponse.json({message}, {status: 500});
  }
}
