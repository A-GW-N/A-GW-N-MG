"use client";

import {useEffect, useState} from "react";

interface HomePageEntranceProps {
  children: React.ReactNode;
}

type EntrancePhase = "intro" | "reveal" | "done";
const HOME_ENTRANCE_SEEN_KEY = "agwn-home-entrance-seen";

export function HomePageEntrance({children}: HomePageEntranceProps) {
  const [phase, setPhase] = useState<EntrancePhase>("intro");
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hasSeenEntrance = window.sessionStorage.getItem(HOME_ENTRANCE_SEEN_KEY) === "true";
    let revealTimer = 0;
    let doneTimer = 0;

    const frameId = window.requestAnimationFrame(() => {
      if (hasSeenEntrance) {
        setPhase("done");
        setShouldAnimate(false);
        setIsReady(true);
        return;
      }

      setShouldAnimate(true);
      setIsReady(true);

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const introDuration = prefersReducedMotion ? 320 : 1800;
      const revealDuration = prefersReducedMotion ? 220 : 760;

      revealTimer = window.setTimeout(() => {
        window.sessionStorage.setItem(HOME_ENTRANCE_SEEN_KEY, "true");
        setPhase("reveal");
      }, introDuration);
      doneTimer = window.setTimeout(() => setPhase("done"), introDuration + revealDuration);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(revealTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <div
        className={[
          "transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          !isReady ? "opacity-0 blur-md [transform:scale(0.985)]" : "",
          shouldAnimate && phase === "intro" ? "opacity-0 blur-md [transform:scale(0.985)]" : "",
          phase === "reveal" ? "opacity-100 blur-0 [transform:scale(1)]" : "",
          phase === "done" ? "opacity-100 blur-0 [transform:scale(1)]" : "",
        ].join(" ")}
      >
        {children}
      </div>

      {shouldAnimate ? (
        <div
          className={[
            "pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-[#f5f5f1] text-foreground transition-[opacity,visibility,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#08090b] dark:text-white",
            phase === "intro" ? "visible opacity-100" : "",
            phase === "reveal" ? "visible opacity-0 [transform:scale(1.015)]" : "",
            phase === "done" ? "invisible opacity-0" : "",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.98),transparent_18%),linear-gradient(180deg,#f8f8f4_0%,#efefea_100%)] dark:bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.12),transparent_16%),linear-gradient(180deg,#08090b_0%,#0b0c0f_100%)]" />
            <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/[0.04] blur-[140px] dark:bg-white/8" />
          </div>

          <div className="relative mx-auto flex w-full max-w-[860px] flex-col items-center px-6 text-center">
            <div className="animate-[agwn-fade-up_900ms_cubic-bezier(0.22,1,0.36,1)_both]">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/65 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.34em] text-foreground/42 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/42">
                Welcome Sequence
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/55 dark:bg-white/60" />
                A-GW-N
              </div>
              <h1 className="mt-6 text-3xl font-black tracking-[-0.06em] sm:text-5xl">
                欢迎来到 A-GW-N 主页面
              </h1>
              <p className="mx-auto mt-4 max-w-[34rem] text-sm leading-7 text-muted-foreground dark:text-white/46 sm:text-base">
                正在载入主页面矩阵与信息板，请稍候。
              </p>
            </div>

            <div className="relative mt-10 flex h-[220px] w-[220px] animate-[agwn-fade-up_1100ms_cubic-bezier(0.22,1,0.36,1)_both] items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-black/8 bg-white/40 shadow-[0_24px_80px_rgba(0,0,0,0.12)] dark:border-white/8 dark:bg-white/[0.02] dark:shadow-[0_24px_80px_rgba(0,0,0,0.36)]" />
              <div className="absolute inset-[18px] rounded-full border border-black/8 dark:border-white/6" />
              <div className="absolute inset-[34px] rounded-full border border-black/6 dark:border-white/5" />
              <div className="absolute inset-[22px] rounded-full border border-transparent border-t-black/70 border-r-black/20 animate-[agwn-orbit_1500ms_cubic-bezier(0.22,1,0.36,1)_infinite] dark:border-t-white/80 dark:border-r-white/22" />
              <div className="absolute inset-[44px] rounded-full border border-transparent border-t-black/28 border-r-black/55 animate-[agwn-orbit-reverse_1900ms_cubic-bezier(0.22,1,0.36,1)_infinite] dark:border-t-white/28 dark:border-r-white/70" />
              <div className="absolute inset-[64px] rounded-full border border-transparent border-t-black/40 animate-[agwn-pulse-ring_1800ms_ease-in-out_infinite] dark:border-t-white/55" />
              <div className="absolute h-3.5 w-3.5 rounded-full bg-foreground shadow-[0_0_26px_rgba(20,20,20,0.32)] animate-[agwn-core-pulse_1300ms_ease-in-out_infinite] dark:bg-white dark:shadow-[0_0_26px_rgba(255,255,255,0.8)]" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
