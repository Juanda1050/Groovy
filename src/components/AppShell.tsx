import { Disc3 } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppShellProps } from "@/models/layout";
import { GlassPanel } from "./GlassPanel";

export function AppShell({ children, actions, navigation }: AppShellProps) {
  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <GlassPanel
        blur
        className="flex items-center justify-between gap-3 px-4 py-3"
      >
        <Link
          to="/"
          aria-label="Groovy"
          className="
            flex shrink-0 items-center gap-2 rounded-lg
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <Disc3 className="text-primary" aria-hidden="true" />
          <span className="text-xl font-bold tracking-tight">Groovy</span>
        </Link>

        {navigation}

        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </GlassPanel>

      <main
        id="mainContent"
        className="
          py-10 pb-[calc(7rem+env(safe-area-inset-bottom))]
          sm:pt-14 md:pb-12
        "
      >
        {children}
      </main>
    </div>
  );
}
