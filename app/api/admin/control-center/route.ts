import {NextResponse} from "next/server";

import {isAdminAuthenticated} from "@/lib/admin/auth";
import {
  loadAccountPoolRegistry,
  loadGatewayProfiles,
  saveAccountPoolRegistry,
  saveGatewayProfiles,
  type AccountPoolRegistryInput,
  type GatewayProfileInput,
} from "@/lib/database/gateway-profiles";
import {
  loadStatisticsCards,
  saveStatisticsCards,
  type StatisticsCardInput,
} from "@/lib/database/statistics-cards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  const [profiles, pools, cards] = await Promise.all([
    loadGatewayProfiles(),
    loadAccountPoolRegistry(),
    loadStatisticsCards(),
  ]);

  return NextResponse.json({profiles, pools, cards});
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({message: "未登录管理界面"}, {status: 401});
  }

  try {
    const body = await request.json();
    const profiles = Array.isArray(body?.profiles) ? (body.profiles as GatewayProfileInput[]) : [];
    const pools = Array.isArray(body?.pools) ? (body.pools as AccountPoolRegistryInput[]) : [];
    const cards = Array.isArray(body?.cards) ? (body.cards as StatisticsCardInput[]) : [];

    const [savedProfiles, savedPools, savedCards] = await Promise.all([
      saveGatewayProfiles(profiles),
      saveAccountPoolRegistry(pools),
      saveStatisticsCards(cards),
    ]);

    return NextResponse.json({
      profiles: savedProfiles,
      pools: savedPools,
      cards: savedCards,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存控制中心失败";
    return NextResponse.json({message}, {status: 500});
  }
}
