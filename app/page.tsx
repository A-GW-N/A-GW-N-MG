import type {Metadata} from "next";
import {HomePageEntrance} from "@/components/home/home-page-entrance";
import {HomePage} from "@/components/home/home-page";
import {loadHomepageContent} from "@/lib/database/homepage-content";
import {loadHomepageBlocks} from "@/lib/database/homepage-blocks";

export const metadata: Metadata = {
  title: "A-GW-N",
  description: "A-GW-N 主页导航层，保留纯色背景与立体模块占位布局。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [blocks, infoPanel] = await Promise.all([loadHomepageBlocks(), loadHomepageContent()]);
  return (
    <HomePageEntrance content={infoPanel}>
      <HomePage blocks={blocks} infoPanel={infoPanel} />
    </HomePageEntrance>
  );
}
