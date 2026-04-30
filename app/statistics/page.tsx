import type {Metadata} from "next";

import {StatisticsPage} from "@/components/statistics/statistics-page";
import {loadStatisticsDashboard} from "@/lib/database/statistics";
import {loadStatisticsCards} from "@/lib/database/statistics-cards";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Token usage statistics dashboard shell for A-GW-N.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StatisticsRoutePage() {
  const [data, cards] = await Promise.all([loadStatisticsDashboard(), loadStatisticsCards()]);
  return <StatisticsPage data={data} cards={cards} />;
}
