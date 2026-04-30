import {ClientYear} from "@/components/client-time";

const ESTIMATED_VERSION = "v1.0.0";

export function SiteFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/45 bg-background/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-4 px-3 py-3 sm:px-4 lg:px-6 xl:px-8 sm:flex-row sm:items-center">
        <div className="text-sm text-muted-foreground">
          © <ClientYear placeholder="2026" /> API-GATEWAY-NEXUS. All rights reserved.
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <span className="font-medium opacity-70">Ver.</span>
          <span className="font-mono">{ESTIMATED_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
