import { useTranslation } from "react-i18next";
import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AppNavigation } from "@/components/AppNavigation";
import { AppShell } from "@/components/AppShell";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppLayout } from "@/hooks/useAppLayout";
import { useAppearance } from "@/hooks/useAppearance";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { usePageStatus } from "@/hooks/usePageStatus";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useTheme } from "@/hooks/useTheme";
import { useAccountLanguage } from "@/hooks/useAccountLanguage";

export default function App() {
  useAppearance();
  useAccountLanguage();
  useAuthBootstrap();

  const { showNavigation } = useAppLayout();
  const { t } = useTranslation("common");
  const { items, label: navigationLabel } = useAppNavigation();
  const { theme, label: themeLabel, toggleTheme } = useTheme();
  const { loadingLabel } = usePageStatus();

  return (
    <AppShell
      skipLabel={t("navigation.skip")}
      navigation={showNavigation ? <AppNavigation items={items} label={navigationLabel} /> : null}
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
