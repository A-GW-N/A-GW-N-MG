import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import type {HomepageContentRow} from "@/lib/types/database";

const HOMEPAGE_CONTENT_TABLE = "homepage_content";
const HOMEPAGE_CONTENT_KEY = "main_info";
let hasLoggedMissingHomepageContentTable = false;

export interface HomepageContentInput {
  content_key?: string;
  title: string;
  hero_title?: string;
  hero_subtitle?: string;
  markdown: string;
}

export function getDefaultHomepageContent(): HomepageContentRow {
  return {
    content_key: HOMEPAGE_CONTENT_KEY,
    title: "Information",
    hero_title: "AI SERVICES",
    hero_subtitle: "INTELLIGENCE MONITOR",
    markdown: [
      "## A-GW-N",
      "",
      "这里可以放主页说明、使用入口提示、版本更新摘要，或者任何你希望展示在主页右侧的信息。",
    ].join("\n"),
  };
}

function normalizeHomepageContent(input: HomepageContentInput): HomepageContentInput {
  return {
    content_key: input.content_key?.trim() || HOMEPAGE_CONTENT_KEY,
    title: input.title.trim() || "Information",
    hero_title: input.hero_title?.trim() || "AI SERVICES",
    hero_subtitle: input.hero_subtitle?.trim() || "INTELLIGENCE MONITOR",
    markdown: input.markdown.trim(),
  };
}

function isMissingHomepageContentTableError(error: {code?: string; message?: string} | null | undefined) {
  return error?.code === "PGRST205" || error?.message?.includes(HOMEPAGE_CONTENT_TABLE);
}

export async function loadHomepageContent(): Promise<HomepageContentRow> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(HOMEPAGE_CONTENT_TABLE)
    .select("content_key, title, hero_title, hero_subtitle, markdown, created_at, updated_at")
    .eq("content_key", HOMEPAGE_CONTENT_KEY)
    .maybeSingle();

  if (error) {
    if (isMissingHomepageContentTableError(error)) {
      if (!hasLoggedMissingHomepageContentTable) {
        console.warn(
          "homepage_content 表尚未创建，当前回退到默认主页信息板。请执行 supabase/schema.sql。"
        );
        hasLoggedMissingHomepageContentTable = true;
      }
    } else {
      console.error("Failed to load homepage content:", error);
    }

    return getDefaultHomepageContent();
  }

  return (data as HomepageContentRow | null) ?? getDefaultHomepageContent();
}

export async function saveHomepageContent(
  content: HomepageContentInput
): Promise<HomepageContentRow> {
  const supabase = createAdminClient();
  const normalized = normalizeHomepageContent(content);

  const {error} = await supabase.from(HOMEPAGE_CONTENT_TABLE).upsert(normalized, {
    onConflict: "content_key",
  });

  if (error) {
    if (isMissingHomepageContentTableError(error)) {
      throw new Error(
        "homepage_content 表不存在，请先执行 supabase/schema.sql。"
      );
    }

    throw new Error(`保存主页信息板失败: ${error.message}`);
  }

  return loadHomepageContent();
}
