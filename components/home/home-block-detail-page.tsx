import type {ReactNode} from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Github,
  LayoutGrid,
  Shield,
} from "lucide-react";

import {SiteFooter} from "@/components/home/site-footer";
import type {HomepageBlockRow} from "@/lib/types";

interface HomeBlockDetailPageProps {
  block: HomepageBlockRow;
}

function resolveTargetHref(block: HomepageBlockRow) {
  if (!block.href.trim() || block.href.trim() === "#") {
    return null;
  }

  return block.href;
}

function getDetailMeta(block: HomepageBlockRow) {
  if (block.slug === "github-org") {
    return {
      label: "GitHub Organization",
      icon: <Github className="h-6 w-6" />,
    };
  }

  if (block.href.startsWith("/admin")) {
    return {
      label: "Admin Control",
      icon: <Shield className="h-6 w-6" />,
    };
  }

  if (block.href.startsWith("/check")) {
    return {
      label: "Check Service",
      icon: <Activity className="h-6 w-6" />,
    };
  }

  return {
    label: "Gateway Module",
    icon: <LayoutGrid className="h-6 w-6" />,
  };
}

function renderTargetCard(
  targetHref: string | null,
  title: string,
  icon: ReactNode
) {
  const className =
    "group/entry relative flex items-center gap-4 overflow-hidden rounded-[1.6rem] border border-[#141414]/10 bg-white px-5 py-5 shadow-[0_10px_28px_rgba(17,17,17,0.06)] transition-colors duration-300 hover:bg-[#faf9f6]";

  const inner = (
    <>
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-[#f2f1ed] text-[#5f5f68]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[1.45rem] font-semibold text-[#151515]">{title}</p>
      </div>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#141414]/10 bg-white text-[#6a6a73] transition-transform duration-300 group-hover/entry:translate-x-0.5">
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </>
  );

  if (!targetHref) {
    return <div className={className}>{inner}</div>;
  }

  if (targetHref.startsWith("http://") || targetHref.startsWith("https://")) {
    return (
      <a href={targetHref} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={targetHref} className={className}>
      {inner}
    </Link>
  );
}

export function HomeBlockDetailPage({block}: HomeBlockDetailPageProps) {
  const targetHref = resolveTargetHref(block);
  const meta = getDetailMeta(block);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7f2] py-4 text-foreground dark:bg-[#08090b] dark:text-white sm:py-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_24%),linear-gradient(180deg,#f8f8f5_0%,#efefea_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,#08090b_0%,#09090b_100%)]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1320px] flex-col justify-center px-4 pb-24 sm:px-6 lg:px-10">
        <section className="overflow-hidden rounded-[2.2rem] border border-black/8 bg-[#f6f6f2] shadow-[0_30px_90px_rgba(15,15,15,0.12)] dark:border-white/10 dark:bg-[#111214] dark:shadow-[0_30px_90px_rgba(0,0,0,0.42)] xl:mx-auto xl:w-[82%] xl:aspect-video">
          <div className="grid h-full xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="relative overflow-hidden bg-[linear-gradient(155deg,#ffffff_0%,#f3f1eb_42%,#ece9e1_100%)] p-6 text-foreground dark:bg-[linear-gradient(155deg,#1d1e23_0%,#121316_42%,#09090b_100%)] dark:text-white sm:p-8 lg:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,255,255,0.16)_34%,rgba(255,255,255,0)_60%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012)_34%,rgba(255,255,255,0)_60%)]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center">
                  <Link
                    href="/"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-black/8 bg-white/66 px-4 text-sm font-medium text-foreground/76 transition-colors hover:bg-white hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-white/76 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                </div>

                <div className="mt-10 flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.1rem] border border-black/8 bg-black/[0.02] text-foreground/80 dark:border-white/8 dark:bg-white/[0.04] dark:text-white/80">
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/42 dark:text-white/42">{meta.label}</p>
                    <h1 className="mt-2 truncate text-[2.25rem] font-semibold leading-none text-foreground dark:text-white sm:text-[2.7rem]">
                      {block.title}
                    </h1>
                  </div>
                </div>

                <div className="mt-auto rounded-[1.8rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.42))] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
                  <p className="text-base leading-8 text-foreground/82 dark:text-white/82">
                    {block.description || "当前模块信息还在整理中。"}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-[#f4f2ec] p-6 text-[#141414] sm:p-8 lg:p-10">
              <div className="flex h-full flex-col justify-center">
                <div className="mx-auto w-full max-w-[460px]">
                  {renderTargetCard(targetHref, block.title, meta.icon)}
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
