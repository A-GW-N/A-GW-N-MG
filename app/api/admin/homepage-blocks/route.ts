import {NextResponse} from "next/server";

import {isAdminAuthenticated} from "@/lib/admin/auth";
import {
  loadHomepageContent,
  saveHomepageContent,
  type HomepageContentInput,
} from "@/lib/database/homepage-content";
import {
  loadHomepageBlocks,
  saveHomepageBlocks,
  type HomepageBlockInput,
} from "@/lib/database/homepage-blocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  const blocks = await loadHomepageBlocks();
  const content = await loadHomepageContent();
  return NextResponse.json({blocks, content});
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = await request.json();
    const blocks = Array.isArray(body?.blocks) ? (body.blocks as HomepageBlockInput[]) : [];
    const content = body?.content as HomepageContentInput | undefined;
    const saved = await saveHomepageBlocks(blocks);
    const savedContent = await saveHomepageContent(content ?? (await loadHomepageContent()));
    return NextResponse.json({blocks: saved, content: savedContent});
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存主页方块失败";
    return NextResponse.json({message}, {status: 500});
  }
}
