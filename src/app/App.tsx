import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AccountMenu } from "@/components/AccountMenu";
import { AppNavigation } from "@/components/AppNavigation";
import { AppShell } from "@/components/AppShell";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PreferencesSection } from "@/pages/PreferencesSection";
import { useAccountLanguage } from "@/hooks/useAccountLanguage";
import { useAppearance } from "@/hooks/useAppearance";
import { useAppLayout } from "@/hooks/useAppLayout";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useBlockingLoading } from "@/hooks/useBlockingLoading";
import { useTheme } from "@/hooks/useTheme";
import { isLocalAuthBypassEnabled } from "@/lib/localDevelopment";
import { useAuthStore } from "@/stores/authStore";

export default function App() {
  const session = useAuthBootstrap();

  useAppearance();
  useAccountLanguage();

  const { t } = useTranslation("common");
  const { requiresLogin, showNavigation } = useAppLayout();
  const { items, label: navigationLabel } = useAppNavigation();
  const { theme, label: themeLabel, toggleTheme } = useTheme();

  const authenticated = useAuthStore(
    (state) => state.status === "authenticated",
  );

  const ready = isLocalAuthBypassEnabled || session.isReady;
  const blocking = (!ready && !session.hasError) || (ready && requiresLogin);

  const loadingDialog = useBlockingLoading(blocking);

  return (
    <>
      <AppShell
        skipLabel={t("navigation.skip")}
        navigation={
          ready && showNavigation ? (
            <AppNavigation items={items} label={navigationLabel} />
          ) : null
        }
        actions={
          ready && authenticated ? (
            <AccountMenu />
          ) : (
            <>
              <PreferencesSection />
              <ThemeToggle
                theme={theme}
                label={themeLabel}
                onToggle={toggleTheme}
              />
            </>
          )
        }
      >
        {!ready ? (
          session.hasError ? (
            <Alert className="mx-auto max-w-md">
              <AlertDescription>
                {t("session.connectionError")}
              </AlertDescription>
              <Button
                type="button"
                variant="outline"
                onClick={session.retry}
                className="mt-4"
              >
                {t("actions.retry")}
              </Button>
            </Alert>
          ) : null
        ) : requiresLogin ? (
          <Navigate to="/auth" replace />
        ) : (
          <Suspense
            fallback={
              <div role="status" aria-label={t("status.loading")}>
                <PageSkeleton />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        )}
      </AppShell>

      <LoadingOverlay {...loadingDialog} label={t("session.loading")} />
    </>
  );
}
