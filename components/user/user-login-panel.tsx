import {ArrowRight, LogIn, User2} from "lucide-react";

import {ThemeToggle} from "@/components/theme-toggle";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";

interface UserLoginPanelProps {
  errorMessage?: string | null;
  registrationMode: "closed" | "open" | "invite_only";
  inviteCodeHint?: string;
}

function normalizeLoginError(message: string | null | undefined) {
  const value = message?.trim() ?? "";
  if (!value) {
    return "";
  }

  const normalized = value.toLowerCase();
  if (
    normalized === "fetch failed" ||
    normalized.includes("failed to fetch") ||
    normalized.includes("rsc payload")
  ) {
    return "";
  }

  return value;
}

function getRegistrationLabel(mode: UserLoginPanelProps["registrationMode"]) {
  if (mode === "open") {
    return "开放注册";
  }
  if (mode === "invite_only") {
    return "邀请码注册";
  }
  return "未开启注册";
}

export function UserLoginPanel({
  errorMessage,
  registrationMode,
  inviteCodeHint,
}: UserLoginPanelProps) {
  const visibleErrorMessage = normalizeLoginError(errorMessage);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="fixed right-4 top-4 z-20 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-[2rem] border border-border/50 bg-background/78 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">A-GW-N USER</h1>
              <p className="mt-3 text-sm text-muted-foreground">使用 Linux.do OAuth2 登录后进入个人主页查看 key、日志和 token 用量。</p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border/40 bg-background/70">
              <User2 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {visibleErrorMessage ? (
              <div className="rounded-[1.2rem] border border-border/50 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                {visibleErrorMessage}
              </div>
            ) : null}

            <div className="rounded-[1.4rem] border border-border/50 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>{getRegistrationLabel(registrationMode)}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
              <p className="mt-3 leading-6">
                {registrationMode === "closed"
                  ? "当前未开启新用户注册，已有用户仍可使用 Linux.do 继续登录。"
                  : registrationMode === "invite_only"
                    ? inviteCodeHint?.trim() || "新用户请先完成 Linux.do 登录，回跳后再填写邀请码完成注册。"
                    : "当前已开放新用户注册，首次登录会自动创建账户与个人 key。"}
              </p>
            </div>

            <a
              href="/api/user/oauth/linuxdo?redirect=/user"
              className={cn(buttonVariants({size: "lg"}), "h-11 rounded-full")}
            >
              <LogIn className="mr-2 h-4 w-4" />
              使用 Linux.do 登录
            </a>

          </div>
        </div>
      </div>
    </div>
  );
}
