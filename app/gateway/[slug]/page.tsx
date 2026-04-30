import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {HomeBlockDetailPage} from "@/components/home/home-block-detail-page";
import {loadHomepageBlockBySlug} from "@/lib/database/homepage-blocks";

interface GatewayDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: GatewayDetailPageProps): Promise<Metadata> {
  const {slug} = await params;
  const block = await loadHomepageBlockBySlug(slug);

  if (!block) {
    return {
      title: "Module Not Found",
    };
  }

  return {
    title: `${block.title} | A-GW-N`,
    description: block.description || `${block.title} 模块详情页`,
  };
}

export default async function GatewayDetailPage({params}: GatewayDetailPageProps) {
  const {slug} = await params;
  const block = await loadHomepageBlockBySlug(slug);

  if (!block) {
    notFound();
  }

  return <HomeBlockDetailPage block={block} />;
}
