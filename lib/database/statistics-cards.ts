import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";
import type {StatisticsCardRow} from "@/lib/types";

const STATISTICS_CARDS_TABLE = "statistics_cards";

export interface StatisticsCardInput {
  card_key: string;
  title: string;
  card_type: string;
  description?: string | null;
  sort_order: number;
  is_enabled: boolean;
  settings?: Record<string, unknown> | null;
}

function normalizeCard(card: StatisticsCardInput, index: number): StatisticsCardInput {
  return {
    card_key: card.card_key.trim(),
    title: card.title.trim() || `Card ${index + 1}`,
    card_type: card.card_type.trim() || "custom",
    description: card.description?.trim() || null,
    sort_order: Number.isFinite(card.sort_order) ? card.sort_order : index,
    is_enabled: Boolean(card.is_enabled),
    settings: card.settings ?? {},
  };
}

function isMissingTableError(error: {code?: string; message?: string} | null | undefined) {
  return error?.code === "PGRST205" || error?.message?.includes(STATISTICS_CARDS_TABLE);
}

export async function loadStatisticsCards(): Promise<StatisticsCardRow[]> {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from(STATISTICS_CARDS_TABLE)
    .select("*")
    .order("sort_order", {ascending: true})
    .order("created_at", {ascending: true});

  if (error) {
    if (!isMissingTableError(error)) {
      console.error("Failed to load statistics cards:", error);
    }
    return [];
  }

  return (data as StatisticsCardRow[]) ?? [];
}

export async function saveStatisticsCards(
  cards: StatisticsCardInput[]
): Promise<StatisticsCardRow[]> {
  const supabase = createAdminClient();
  const payload = cards
    .filter((card) => card.card_key.trim().length > 0)
    .map((card, index) => normalizeCard(card, index));

  if (payload.length === 0) {
    const {error} = await supabase.from(STATISTICS_CARDS_TABLE).delete().not("card_key", "is", null);
    if (error) {
      throw new Error(`清空统计卡片失败: ${error.message}`);
    }
    return [];
  }

  const {error} = await supabase.from(STATISTICS_CARDS_TABLE).upsert(payload, {
    onConflict: "card_key",
  });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("statistics_cards 表不存在，请先执行 supabase/schema.sql。");
    }
    throw new Error(`保存统计卡片失败: ${error.message}`);
  }

  const keepKeys = payload.map((item) => item.card_key);
  const {data: existingRows} = await supabase.from(STATISTICS_CARDS_TABLE).select("card_key");
  const removeKeys = ((existingRows as Array<{card_key: string}> | null) ?? [])
    .map((row) => row.card_key)
    .filter((key) => !keepKeys.includes(key));

  if (removeKeys.length > 0) {
    await supabase.from(STATISTICS_CARDS_TABLE).delete().in("card_key", removeKeys);
  }

  return loadStatisticsCards();
}
