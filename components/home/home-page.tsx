import Image from "next/image";
import Link from "next/link";
import {Activity, ArrowUpRight, Github, Shield} from "lucide-react";

import {CornerPlus} from "@/components/corner-plus";
import {CardHoverFrame} from "@/components/home/card-hover-frame";
import {SiteFooter} from "@/components/home/site-footer";
import {MarkdownContent} from "@/components/markdown-content";
import {ThemeToggle} from "@/components/theme-toggle";
import type {HomepageBlockRow, HomepageContentRow} from "@/lib/types";

interface HomePageProps {
  blocks: HomepageBlockRow[];
  infoPanel: HomepageContentRow;
}

function getGithubAvatarUrl(href: string) {
  const match = href.match(/github\.com\/([^/?#]+)/i);
  const handle = match?.[1] ?? "A-GW-N";
  return `https://github.com/${handle}.png?size=160`;
}

function getGithubHandle(href: string) {
  const match = href.match(/github\.com\/([^/?#]+)/i);
  return match?.[1] ?? "A-GW-N";
}

function resolveCardHref(card: HomepageBlockRow) {
  const href = card.href.trim();
  if (!href || href === "#") {
    return null;
  }

  return href;
}

const colSpanClassMap: Record<number, string> = {
  1: "xl:col-span-1",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
  4: "xl:col-span-4",
};

const rowSpanClassMap: Record<number, string> = {
  1: "xl:row-span-1",
  2: "xl:row-span-2",
  3: "xl:row-span-3",
};

function getCardGlyph(card: HomepageBlockRow, href: string) {
  if (card.slug === "github-org") {
    return <Github className="h-4 w-4" />;
  }
  if (href.startsWith("/admin")) {
    return <Shield className="h-4 w-4" />;
  }
  if (href.startsWith("/check")) {
    return <Activity className="h-4 w-4" />;
  }
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return <ArrowUpRight className="h-4 w-4" />;
  }

  return <span className="h-2.5 w-2.5 rounded-full bg-foreground/70 dark:bg-white/70" />;
}

export function HomePage({blocks, infoPanel}: HomePageProps) {
  const activeBlocks = blocks.filter((block) => block.is_active);

  return (
    <div className="relative min-h-screen py-4 sm:py-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.92),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.62),transparent_18%),linear-gradient(180deg,#f8f8f6_0%,#f1f1ed_40%,#ebebe6_100%)] dark:bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#09090a_0%,#0d0d10_38%,#0b0b0d_100%)]" />
        <div className="absolute left-[8%] top-[10%] h-[260px] w-[260px] rounded-full bg-black/[0.04] blur-[120px] dark:bg-white/6" />
        <div className="absolute bottom-[12%] right-[12%] h-[280px] w-[280px] rounded-full bg-black/[0.03] blur-[140px] dark:bg-white/5" />
      </div>

      <CornerPlus className="fixed left-4 top-4 h-6 w-6 text-border md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 text-border md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 text-border md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 text-border md:bottom-8 md:right-8" />

      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 md:right-8 md:top-8">
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          <Shield className="mr-2 h-4 w-4" />
          Admin
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1520px] flex-col gap-6 px-3 pb-24 sm:px-4 sm:pb-24 lg:px-6 lg:pb-24 xl:px-8">
        <main className="relative z-10 flex min-h-full flex-col">
          <section className="flex-1 border-b border-border/40 pb-14 pt-2 lg:pb-20">
            <div className="mb-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-foreground/55 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.035] dark:text-white/44">
                  A-GW-N
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/45 dark:bg-white/55" />
                  Main Surface
                </div>
                <div className="space-y-3">
                  <h1 className="text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl md:text-6xl">
                    {infoPanel.hero_title?.trim() || "A-GW-N"}
                    <br />
                    <span className="text-foreground/42 dark:text-white/42">
                      {infoPanel.hero_subtitle?.trim() || "GATE ARRAY"}
                    </span>
                  </h1>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,840px)_minmax(580px,640px)] xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="grid gap-4 [perspective:1800px] sm:grid-cols-2 xl:auto-rows-[214px] xl:grid-cols-3">
                  {activeBlocks.map((card) => {
                    const resolvedHref = resolveCardHref(card);
                    const isExternal = Boolean(
                      resolvedHref &&
                        (resolvedHref.startsWith("http://") || resolvedHref.startsWith("https://"))
                    );
                    const isGithubCard = card.slug === "github-org";
                    const githubHandle = isGithubCard ? getGithubHandle(card.href) : null;
                    const showStatus = Boolean(card.status_label?.trim()) && card.status_label !== "Reserved";
                    const cardClasses = `group relative isolate min-h-[214px] overflow-hidden rounded-[1.75rem] border border-black/8 bg-[#f6f6f2] p-5 shadow-[0_20px_56px_rgba(15,15,15,0.08)] transition-[transform,box-shadow,border-color] duration-300 will-change-transform [transform-style:preserve-3d] hover:border-black/14 hover:shadow-[0_28px_78px_rgba(15,15,15,0.14)] dark:border-white/8 dark:bg-[#0f1012] dark:shadow-[0_20px_56px_rgba(0,0,0,0.34)] dark:hover:border-white/14 dark:hover:shadow-[0_28px_78px_rgba(0,0,0,0.44)] hover:[transform:translateY(-4px)_rotateX(2deg)_rotateY(-2deg)] ${colSpanClassMap[card.col_span] ?? colSpanClassMap[1]} ${rowSpanClassMap[card.row_span] ?? rowSpanClassMap[1]} ${card.row_span > 1 ? "xl:min-h-[unset]" : ""}`;
                    const cardInner = (
                      <>
                        <div className="absolute inset-[1px] rounded-[1.68rem] bg-[linear-gradient(165deg,rgba(255,255,255,0.92),rgba(255,255,255,0.38)_24%,rgba(255,255,255,0.08)_52%)] dark:bg-[linear-gradient(165deg,rgba(255,255,255,0.085),rgba(255,255,255,0.022)_24%,rgba(255,255,255,0)_52%)]" />
                        <div className="absolute inset-[1px] rounded-[1.68rem] bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.55),transparent_28%),radial-gradient(circle_at_78%_84%,rgba(255,255,255,0.22),transparent_26%)] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_78%_84%,rgba(255,255,255,0.035),transparent_26%)]" />
                        <div className="absolute inset-[1px] rounded-[1.68rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-12px_18px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-12px_18px_rgba(0,0,0,0.14)]" />
                        <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />
                        <CardHoverFrame />

                        {isGithubCard ? (
                          <div className="relative z-10 flex h-full flex-col justify-between [transform-style:preserve-3d]">
                            <div className="flex items-center justify-between gap-3 transition-transform duration-300 group-hover:[transform:translateZ(14px)]">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] border border-black/8 bg-black/[0.02] text-foreground/72 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/72">
                                <Github className="h-4 w-4" />
                              </div>
                              <span className="rounded-full border border-black/8 bg-black/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-foreground/42 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/42">
                                Org
                              </span>
                            </div>

                            <div className="mt-6 flex items-center gap-4 transition-transform duration-300 group-hover:[transform:translateZ(18px)]">
                              <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[1.25rem] border border-black/8 bg-[#ecece8] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-white/8 dark:bg-[#15161a] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                <Image
                                  src={card.image_data_url || getGithubAvatarUrl(card.href)}
                                  alt={`${card.title} avatar`}
                                  fill
                                  sizes="76px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.26em] text-foreground/34 dark:text-white/34">
                                  {card.title}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                  <h2 className="truncate text-[1.65rem] font-semibold leading-none text-foreground dark:text-white">
                                    {githubHandle}
                                  </h2>
                                  <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-[0.8rem] border border-black/8 bg-black/[0.02] text-foreground/68 dark:border-white/8 dark:bg-white/[0.04] dark:text-white/68">
                                    <Github className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="mt-auto line-clamp-3 pt-6 text-sm leading-7 text-muted-foreground transition-transform duration-300 group-hover:[transform:translateZ(14px)] dark:text-white/54">
                              {card.description}
                            </p>
                          </div>
                        ) : (
                          <div className="relative z-10 flex h-full flex-col [transform-style:preserve-3d]">
                            <div className="flex items-center justify-between gap-3 transition-transform duration-300 group-hover:[transform:translateZ(14px)]">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] border border-black/8 bg-black/[0.02] text-foreground/72 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/72">
                                {getCardGlyph(card, card.href.trim())}
                              </div>
                              {showStatus ? (
                                <span className="rounded-full border border-black/8 bg-black/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/40 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/40">
                                  {card.status_label}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-auto space-y-4 transition-transform duration-300 group-hover:[transform:translateZ(18px)]">
                              <h2 className="line-clamp-2 text-[1.55rem] font-semibold leading-[1.08] text-foreground dark:text-white sm:text-[1.72rem]">
                                {card.title}
                              </h2>
                              <p
                                className={`max-w-[82%] text-sm leading-7 text-muted-foreground dark:text-white/54 ${card.row_span > 1 ? "line-clamp-4" : "line-clamp-3"}`}
                              >
                                {card.description}
                              </p>
                            </div>

                            <div className="absolute bottom-0 right-0 transition-transform duration-300 group-hover:[transform:translateZ(16px)]">
                              <div className="grid h-9 w-9 place-items-center rounded-full border border-black/8 bg-black/[0.02] text-foreground/42 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/42">
                                <ArrowUpRight className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );

                    return !resolvedHref ? (
                      <div key={card.slug} className={cardClasses}>
                        {cardInner}
                      </div>
                    ) : isExternal ? (
                      <a
                        key={card.slug}
                        href={resolvedHref}
                        target="_blank"
                        rel="noreferrer"
                        className={cardClasses}
                      >
                        {cardInner}
                      </a>
                    ) : (
                      <Link key={card.slug} href={resolvedHref} className={cardClasses}>
                        {cardInner}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <aside className="xl:sticky xl:top-8 xl:pl-2">
                <article className="relative overflow-hidden rounded-[2rem] border border-black/8 bg-[#f5f5f0]/96 p-6 shadow-[0_24px_64px_rgba(15,15,15,0.1)] sm:p-7 dark:border-white/8 dark:bg-[#111214]/96 dark:shadow-[0_24px_64px_rgba(0,0,0,0.36)]">
                  <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] border border-black/6 dark:border-white/6" />
                  <div className="absolute left-[-18%] top-[-10%] h-[180px] w-[180px] rounded-full bg-black/[0.035] blur-[90px] dark:bg-white/7" />
                  <div className="absolute inset-x-7 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/30 dark:text-white/30">
                          Information Board
                        </p>
                        <h2 className="mt-3 text-[1.7rem] font-semibold leading-tight text-foreground dark:text-white">
                          {infoPanel.title}
                        </h2>
                      </div>
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] border border-black/8 bg-black/[0.02] text-foreground/66 dark:border-white/8 dark:bg-white/[0.04] dark:text-white/66">
                        <Activity className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="mt-6 rounded-[1.5rem] border border-black/8 bg-white/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] sm:p-6 dark:border-white/8 dark:bg-black/20 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="max-h-[62vh] overflow-y-auto pr-1">
                        <MarkdownContent content={infoPanel.markdown} />
                      </div>
                    </div>
                  </div>
                </article>
              </aside>
            </div>
          </section>
          <SiteFooter />
        </main>
      </div>
    </div>
  );
}
