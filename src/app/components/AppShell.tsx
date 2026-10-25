import type { AppShellProps } from "@/models/layout";
import { BrandMark } from "@/shared/components/BrandMark";
import { Link } from 'react-router-dom';

export function AppShell({ children, actions, navigation, skipLabel }: AppShellProps) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-7xl px-4 sm:px-6 lg:px-10">
      <a href="#mainContent" className="fixed left-4 top-3 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0">
        {skipLabel}
      </a>
      <header className="flex min-h-24 items-center justify-between gap-3 border-b border-border/40 sm:min-h-28">
        <Link to="/" aria-label="Groovy" className="flex shrink-0 items-center gap-3 rounded-lg">
          <BrandMark />
          <span className="text-2xl font-bold tracking-[-0.06em] sm:text-3xl">Groovy</span>
        </Link>
        {navigation}
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </header>
      <main id="mainContent" tabIndex={-1} className="py-9 pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none sm:pt-12 md:pb-12">
        {children}
      </main>
    </div>
  )
}
