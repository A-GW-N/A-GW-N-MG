"use client";

import {useState, useTransition} from "react";
import {Shield, UnlockKeyhole} from "lucide-react";
import {useRouter} from "next/navigation";

import {ThemeToggle} from "@/components/theme-toggle";
import {Button} from "@/components/ui/button";

interface AdminLoginPanelProps {
  mode?: "password" | "oauth-admin";
}

export function AdminLoginPanel({mode = "password"}: AdminLoginPanelProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({password}),
        });

        const result = (await response.json()) as {message?: string};
        if (!response.ok) {
          throw new Error(result.message ?? "登录失败");
        }

        router.refresh();
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "登录失败");
      }
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="fixed right-4 top-4 z-20 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-[2rem] border border-border/50 bg-background/78 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">A-GW-N ADMIN</h1>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border/40 bg-background/70">
              <Shield className="h-5 w-5" />
            </div>
          </div>

          {mode === "password" ? (
            <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
              <label className="grid text-sm">
                <div className="flex items-center gap-3 rounded-[1.3rem] border border-border/50 bg-background/70 px-4 py-3">
                  <UnlockKeyhole className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="输入管理密码"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              {statusMessage && (
                <div className="rounded-[1.2rem] border border-border/50 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                  {statusMessage}
                </div>
              )}

              <Button type="submit" disabled={isPending} className="h-11 rounded-full">
                {isPending ? "Unlocking..." : "Enter Admin"}
              </Button>
            </form>
          ) : (
            <div className="mt-8 grid gap-4">
              <div className="rounded-[1.3rem] border border-border/50 bg-background/65 px-4 py-4 text-sm leading-7 text-muted-foreground">
                当前管理入口未启用独立密码，请先从 `/user` 使用管理员账号登录，随后可直接进入管理页面。
              </div>
              <a
                href="/user"
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                前往用户登录
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
