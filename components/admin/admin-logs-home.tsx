import Link from "next/link";
import {ArrowLeft, FileClock, LogIn, ShieldCheck} from "lucide-react";

import {AdminLogoutButton} from "@/components/admin/admin-logout-button";
import {CornerPlus} from "@/components/corner-plus";
import {ThemeToggle} from "@/components/theme-toggle";

interface LogCategoryCard {
  href: string;
  label: string;
  title: string;
  description: string;
  total: number;
  success: number;
  icon: "request" | "auth";
}

interface AdminLogsHomeProps {
  categories: LogCategoryCard[];
  isProtected: boolean;
}

function CategoryIcon({icon}: {icon: LogCategoryCard["icon"]}) {
  if (icon === "auth") {
    return <LogIn className="h-5 w-5" />;
  }

  return <FileClock className="h-5 w-5" />;
}

export function AdminLogsHome({categories, isProtected}: AdminLogsHomeProps) {
  return (
    <div className="relative min-h-screen py-4 sm:py-6">
      <CornerPlus className="fixed left-4 top-4 h-6 w-6 text-border md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 text-border md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 text-border md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 text-border md:bottom-8 md:right-8" />

      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 md:right-8 md:top-8">
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back Admin
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/55 bg-background/72 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/86"
        >
          Back Home
        </Link>
        {isProtected ? <AdminLogoutButton /> : null}
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1520px] flex-col gap-6 px-3 pb-24 sm:px-4 lg:px-6 xl:px-8">
        <header className="pt-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Logs Layer
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </div>
          <div className="mt-5 space-y-4">
            <h1 className="text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl md:text-6xl">
              ADMIN
              <br />
              <span className="text-muted-foreground">LOG CATEGORIES</span>
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              先选择日志大类。每个方块都可点击进入对应分类详情页，目前已拆分为请求日志和登录认证日志。
            </p>
          </div>
        </header>

        <main className="relative z-10 grid gap-5 md:grid-cols-2">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm transition hover:border-border/70 hover:bg-background/78"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    {category.label}
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight">{category.title}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/40 bg-background/75">
                  <CategoryIcon icon={category.icon} />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <article className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Total</p>
                  <p className="mt-3 text-3xl font-black tracking-tight">{String(category.total).padStart(2, "0")}</p>
                </article>
                <article className="rounded-[1.3rem] border border-border/45 bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Success</p>
                      <p className="mt-3 text-3xl font-black tracking-tight">{String(category.success).padStart(2, "0")}</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  </div>
                </article>
              </div>
            </Link>
          ))}
        </main>
      </div>
    </div>
  );
}
