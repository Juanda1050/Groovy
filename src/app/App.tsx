import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AppNavigation } from "@/components/AppNavigation";
import { AppShell } from "@/components/AppShell";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppearance } from "@/hooks/useAppearance";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { usePageStatus } from "@/hooks/usePageStatus";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useTheme } from "@/hooks/useTheme";

export default function App() {
  useAppearance();
  useAuthBootstrap();

  const { items, label: navigationLabel } = useAppNavigation();
  const { theme, label: themeLabel, toggleTheme } = useTheme();
  const { loadingLabel } = usePageStatus();

  return (
    <AppShell
      navigation={<AppNavigation items={items} label={navigationLabel} />}
      actions={
        <ThemeToggle theme={theme} label={themeLabel} onToggle={toggleTheme} />
      }
    >
      <Suspense
        fallback={
          <div role="status" aria-label={loadingLabel}>
            <PageSkeleton />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
