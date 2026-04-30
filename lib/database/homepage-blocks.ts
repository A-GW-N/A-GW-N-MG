import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import type {HomepageBlockRow} from "@/lib/types/database";

const HOMEPAGE_BLOCKS_TABLE = "homepage_blocks";
let hasLoggedMissingTable = false;
let hasLoggedAvatarCachePersistenceIssue = false;

export interface HomepageBlockInput {
  slug: string;
  title: string;
  href: string;
  description: string;
  status_label: string;
  image_data_url?: string | null;
  col_span: number;
  row_span: number;
  sort_order: number;
  is_active: boolean;
}

export function getDefaultHomepageBlocks(): HomepageBlockInput[] {
  return [
    {
      slug: "check",
      title: "Check",
      href: "/check",
      description: "打开实时检测服务面板。",
      status_label: "Live",
      image_data_url: null,
      col_span: 2,
      row_span: 1,
      sort_order: 0,
      is_active: true,
    },
    {
      slug: "admin",
      title: "Admin",
      href: "/admin",
      description: "进入管理主页，维护方块与内容。",
      status_label: "Control",
      image_data_url: null,
      col_span: 2,
      row_span: 1,
      sort_order: 1,
      is_active: true,
    },
    {
      slug: "github-org",
      title: "GitHub Org",
      href: "https://github.com/A-GW-N",
      description: "组织仓库与公开项目入口。",
      status_label: "Link",
      image_data_url: null,
      col_span: 1,
      row_span: 1,
      sort_order: 2,
      is_active: true,
    },
    {
      slug: "gateway-03",
      title: "Gateway 03",
      href: "#",
      description: "预留业务入口，后续接真实模块。",
      status_label: "Reserved",
      image_data_url: null,
      col_span: 1,
      row_span: 1,
      sort_order: 3,
      is_active: true,
    },
    {
      slug: "gateway-04",
      title: "Gateway 04",
      href: "#",
      description: "预留业务入口，后续接真实模块。",
      status_label: "Reserved",
      image_data_url: null,
      col_span: 1,
      row_span: 1,
      sort_order: 4,
      is_active: true,
    },
    {
      slug: "gateway-05",
      title: "Gateway 05",
      href: "#",
      description: "预留业务入口，后续接真实模块。",
      status_label: "Reserved",
      image_data_url: null,
      col_span: 1,
      row_span: 1,
      sort_order: 5,
      is_active: true,
    },
    {
      slug: "gateway-06",
      title: "Gateway 06",
      href: "#",
      description: "预留业务入口，后续接真实模块。",
      status_label: "Reserved",
      image_data_url: null,
      col_span: 1,
      row_span: 1,
      sort_order: 6,
      is_active: true,
    },
  ];
}

function normalizeBlock(input: HomepageBlockInput, index: number): HomepageBlockInput {
  return {
    slug: input.slug.trim(),
    title: input.title.trim() || `Gateway ${String(index + 1).padStart(2, "0")}`,
    href: input.href.trim() || "#",
    description: input.description.trim(),
    status_label: input.status_label.trim() || "Reserved",
    image_data_url: input.image_data_url?.trim() || null,
    col_span: Math.min(4, Math.max(1, Number(input.col_span) || 1)),
    row_span: Math.min(3, Math.max(1, Number(input.row_span) || 1)),
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : index,
    is_active: Boolean(input.is_active),
  };
}

function getGithubAvatarUrl(href: string) {
  const match = href.match(/github\.com\/([^/?#]+)/i);
  const handle = match?.[1] ?? "A-GW-N";
  return `https://github.com/${handle}.png?size=160`;
}

async function fetchImageAsDataUrl(url: string) {
  const response = await fetch(url, {cache: "no-store"});
  if (!response.ok) {
    throw new Error(`头像下载失败: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return `data:${contentType};base64,${base64}`;
}

async function withCachedGithubAvatar(block: HomepageBlockInput) {
  if (block.slug !== "github-org" || block.image_data_url) {
    return block;
  }

  try {
    return {
      ...block,
      image_data_url: await fetchImageAsDataUrl(getGithubAvatarUrl(block.href)),
    };
  } catch (error) {
    console.error("Failed to cache GitHub avatar:", error);
    return block;
  }
}

function getUnknownErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    return typeof message === "string" ? message : "";
  }

  return "";
}

function isMissingHomepageBlockImageColumnError(error: unknown) {
  return getUnknownErrorMessage(error).includes("image_data_url");
}

async function ensureGithubAvatarCached(rows: HomepageBlockRow[]) {
  const githubBlock = rows.find((row) => row.slug === "github-org" && !row.image_data_url);
  if (!githubBlock) {
    return rows;
  }

  const cachedBlock = await withCachedGithubAvatar(githubBlock);
  if (!cachedBlock.image_data_url) {
    return rows;
  }

  const supabase = createAdminClient();
  const {error} = await supabase
    .from(HOMEPAGE_BLOCKS_TABLE)
    .update({image_data_url: cachedBlock.image_data_url})
    .eq("slug", githubBlock.slug);

  if (error) {
    if (!hasLoggedAvatarCachePersistenceIssue) {
      if (isMissingHomepageBlockImageColumnError(error)) {
        console.warn(
          "homepage_blocks.image_data_url 字段尚未可用，当前跳过 GitHub 头像落库。请执行 supabase/schema.sql。"
        );
      } else {
        const message = getUnknownErrorMessage(error);
        console.warn(
          `GitHub 头像缓存未写入数据库，当前回退到运行时头像。${message ? ` 原因: ${message}` : ""}`
        );
      }

      hasLoggedAvatarCachePersistenceIssue = true;
    }

    return rows;
  }

  return rows.map((row) =>
    row.slug === githubBlock.slug ? {...row, image_data_url: cachedBlock.image_data_url} : row
  );
}

function isMissingHomepageBlocksTableError(error: {code?: string; message?: string} | null | undefined) {
  return error?.code === "PGRST205" || error?.message?.includes("homepage_blocks");
}

export async function loadHomepageBlocks(): Promise<HomepageBlockRow[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(HOMEPAGE_BLOCKS_TABLE)
    .select("*")
    .order("sort_order", {ascending: true})
    .order("created_at", {ascending: true});

  if (error) {
    if (isMissingHomepageBlocksTableError(error)) {
      if (!hasLoggedMissingTable) {
        console.warn(
          "homepage_blocks 表尚未创建，当前回退到默认主页方块。请执行 supabase/schema.sql。"
        );
        hasLoggedMissingTable = true;
      }
    } else {
      console.error("Failed to load homepage blocks:", error);
    }
    return getDefaultHomepageBlocks().map((item) => ({
      id: item.slug,
      ...item,
    }));
  }

  const rows = (data as HomepageBlockRow[]) ?? [];
  return ensureGithubAvatarCached(rows);
}

export async function loadHomepageBlockBySlug(slug: string): Promise<HomepageBlockRow | null> {
  const rows = await loadHomepageBlocks();
  return rows.find((row) => row.slug === slug) ?? null;
}

export async function saveHomepageBlocks(
  blocks: HomepageBlockInput[]
): Promise<HomepageBlockRow[]> {
  const supabase = createAdminClient();
  const sanitized = blocks
    .filter((block) => block.slug.trim().length > 0)
    .map((block, index) => normalizeBlock(block, index));
  const cachedBlocks = await Promise.all(sanitized.map(withCachedGithubAvatar));

  if (cachedBlocks.length === 0) {
    const {error: deleteAllError} = await supabase
      .from(HOMEPAGE_BLOCKS_TABLE)
      .delete()
      .not("slug", "is", null);

    if (deleteAllError) {
      throw new Error(`清空主页方块失败: ${deleteAllError.message}`);
    }

    return [];
  }

  const {error} = await supabase.from(HOMEPAGE_BLOCKS_TABLE).upsert(cachedBlocks, {
    onConflict: "slug",
  });

  if (error) {
    if (isMissingHomepageBlocksTableError(error)) {
      throw new Error(
        "homepage_blocks 表不存在，请先执行 supabase/schema.sql。"
      );
    }
    throw new Error(`保存主页方块失败: ${error.message}`);
  }

  const keepSlugs = cachedBlocks.map((item) => item.slug);
  const {data: existingRows, error: existingError} = await supabase
    .from(HOMEPAGE_BLOCKS_TABLE)
    .select("slug");

  if (!existingError) {
    const removedSlugs = ((existingRows as Array<{slug: string}> | null) ?? [])
      .map((row) => row.slug)
      .filter((slug) => !keepSlugs.includes(slug));

    if (removedSlugs.length > 0) {
      const {error: deleteError} = await supabase
        .from(HOMEPAGE_BLOCKS_TABLE)
        .delete()
        .in("slug", removedSlugs);

      if (deleteError) {
        console.error("Failed to prune removed homepage blocks:", deleteError);
      }
    }
  }

  return loadHomepageBlocks();
}
