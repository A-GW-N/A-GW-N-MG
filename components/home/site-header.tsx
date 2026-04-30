"use client";

import Link from "next/link";
import {useState} from "react";
import {Activity, ChevronLeft, Menu} from "lucide-react";

import {ThemeToggle} from "@/components/theme-toggle";
import {cn} from "@/lib/utils";

interface SiteHeaderProps {
  currentLabel: string;
  currentDescription: string;
}

export function SiteHeader({ currentLabel, currentDescription }: SiteHeaderProps) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isExpanded = expanded || mobileOpen;

  return (
    <aside
      className={cn(
        "group lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:transition-[width] lg:duration-300",
        expanded ? "lg:w-[232px]" : "lg:w-[92px]"
      )}
    >
      <div className="flex h-full flex-col gap-4 rounded-[1.75rem] border border-border/50 bg-background/70 p-4 backdrop-blur-xl sm:p-5 lg:rounded-[2rem]">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <div className={cn("transition-all duration-300", !expanded && "lg:hidden")}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                A-GW-N
              </p>
              <p className="text-sm font-semibold tracking-tight">Access Gateway Node</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-background/60 transition-colors hover:bg-muted/40 lg:hidden"
              aria-label="Toggle navigation panel"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-background/60 transition-colors hover:bg-muted/40 lg:inline-flex"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft
                className={cn("h-4 w-4 transition-transform duration-300", !expanded && "rotate-180")}
              />
            </button>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300 lg:overflow-visible",
            isExpanded ? "max-h-[320px] opacity-100" : "max-h-[88px] opacity-100"
          )}
        >
          <div className="relative rounded-[1.6rem] border border-border/50 bg-background/50 p-4">
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground",
                !expanded && "lg:text-center"
              )}
            >
              Global Nav
            </p>
            <div className="mt-4 flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(34,197,94,0.55)]" />
              <div className={cn("min-w-0", !expanded && "lg:hidden")}>
                <p className="text-sm font-semibold tracking-tight">{currentLabel}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{currentDescription}</p>
              </div>
            </div>
            {!expanded && (
              <div className="pointer-events-none absolute left-[calc(100%+12px)] top-3 hidden w-56 rounded-[1.4rem] border border-border/50 bg-background/88 p-4 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {currentLabel}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{currentDescription}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 lg:flex-col lg:items-stretch">
          <div
            className={cn(
              "inline-flex flex-1 items-center justify-center rounded-full border border-border/60 bg-background/55 px-4 py-2 text-sm font-medium text-muted-foreground lg:min-h-[50px] lg:flex-none lg:rounded-2xl",
              !expanded && "lg:px-0"
            )}
          >
            <span className={cn(!expanded && "lg:hidden")}>Home Cards Drive Routing</span>
            <span className={cn("hidden lg:inline-flex", expanded && "lg:hidden")}>GW</span>
          </div>
          <div className="hidden lg:flex lg:justify-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
