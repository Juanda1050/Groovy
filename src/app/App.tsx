import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppNavigation } from "@/components/AppNavigation";
import { AppShell } from "@/components/AppShell";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PreferencesSection } from "@/pages/PreferencesSection";
import { useAccountLanguage } from "@/hooks/useAccountLanguage";
import { useAppearance } from "@/hooks/useAppearance";
import { useAppLayout } from "@/hooks/useAppLayout";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { usePageStatus } from "@/hooks/usePageStatus";
import { useTheme } from "@/hooks/useTheme";

export default function App() {
  useAuthBootstrap();
  useAppearance();
  useAccountLanguage();

  const { t } = useTranslation("common");
  const { showNavigation } = useAppLayout();
  const { items, label: navigationLabel } = useAppNavigation();
  const { theme, label: themeLabel, toggleTheme } = useTheme();
  const { loadingLabel } = usePageStatus();

  return (
    <AppShell
      skipLabel={t("navigation.skip")}
      navigation={
        showNavigation ? (
          <AppNavigation items={items} label={navigationLabel} />
        ) : null
      }
      actions={
        <>
          <PreferencesSection />

          <ThemeToggle
            theme={theme}
            label={themeLabel}
            onToggle={toggleTheme}
          />
        </>
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
