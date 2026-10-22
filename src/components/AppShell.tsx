import { Disc3 } from "lucide-react";
import { GlassPanel } from "./GlassPanel";
import type { AppShellProps } from "@/models/layout";

export function AppShell({ children, actions, navigation }: AppShellProps) {
  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <GlassPanel
        blur
        className="flex items-center justify-between gap-4 px-4 py-3"
      >
        <a
          href="/"
          aria-label="Groovy"
          className="
            flex items-center gap-2 rounded-lg
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <Disc3 className="text-primary" aria-hidden="true" />
          <span className="text-xl font-bold tracking-tight">Groovy</span>
        </a>

        <div className="flex items-center gap-2">{actions}</div>
      </GlassPanel>

      <main className="py-10 pb-28 sm:py-14">{children}</main>

      {navigation}
    </div>
  );
}
