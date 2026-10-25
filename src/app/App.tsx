import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Navigate,Outlet } from "react-router-dom";

import { AccountMenu } from "@/app/components/AccountMenu";
import { AppNavigation } from "@/app/components/AppNavigation";
import { AppShell } from "@/app/components/AppShell";
import { ThemeToggle } from "@/features/preferences/components/ThemeToggle";
import { PreferencesSection } from "@/features/preferences/pages/PreferencesSection";
import { LoadingOverlay } from "@/shared/components/LoadingOverlay";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Alert,AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Toaster } from "@/shared/components/ui/toast";

import { useAppLayout } from "@/app/hooks/useAppLayout";
import { useAppNavigation } from "@/app/hooks/useAppNavigation";
import { useAuthBootstrap } from "@/features/auth/hooks/useAuthBootstrap";
import { useAccountLanguage } from "@/features/preferences/hooks/useAccountLanguage";
import { useAppearance } from "@/features/preferences/hooks/useAppearance";
import { useTheme } from "@/features/preferences/hooks/useTheme";
import { useBlockingLoading } from "@/shared/hooks/useBlockingLoading";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { isLocalAuthBypassEnabled } from "@/shared/lib/localDevelopment";

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

      <Toaster />
    </>
  );
}
