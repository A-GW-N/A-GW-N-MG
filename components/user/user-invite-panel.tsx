import {KeyRound, LogIn} from "lucide-react";

import {ThemeToggle} from "@/components/theme-toggle";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";

interface UserInvitePanelProps {
  errorMessage?: string | null;
  username?: string;
  displayName?: string;
}

export function UserInvitePanel({
  errorMessage,
  username,
  displayName,
}: UserInvitePanelProps) {
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
              <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">填写邀请码</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {displayName || username
                  ? `欢迎，${displayName || username}。填写有效邀请码后会自动创建账户并生成个人 key。`
                  : "填写有效邀请码后会自动创建账户并生成个人 key。"}
              </p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border/40 bg-background/70">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {errorMessage ? (
              <div className="rounded-[1.2rem] border border-border/50 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                {errorMessage}
              </div>
            ) : null}

            <form action="/api/user/register-invite" method="POST" className="grid gap-3">
              <input
                type="text"
                name="invite_code"
                placeholder="请输入邀请码"
                className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                className={cn(buttonVariants({size: "lg"}), "h-11 rounded-full")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                验证邀请码并注册
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
