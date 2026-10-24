import { Navigate, Outlet, useMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { isLocalAuthBypassEnabled } from "@/lib/localDevelopment";
import { useAuthStore } from "@/stores/authStore";

export default function ProtectedLayout() {
  const status = useAuthStore((state) => state.status);
  const profile = useProfile();
  const onboardingRoute = useMatch("/onboarding");
  const { t } = useTranslation("profile");

  if (isLocalAuthBypassEnabled) {
    return <Outlet />;
  }

  if (status !== "authenticated") {
    return <ProtectedRoute status={status} />;
  }

  if (profile.isPending) {
    return <PageSkeleton />;
  }

  if (profile.isError) {
    return (
      <Alert className="max-w-lg">
        <AlertDescription>{t("feedback.loadFailed")}</AlertDescription>

        <Button
          type="button"
          variant="outline"
          disabled={profile.isFetching}
          onClick={() => void profile.refetch()}
          className="mt-3"
        >
          {t("actions.retry")}
        </Button>
      </Alert>
    );
  }

  if (!profile.data) {
    return <PageSkeleton />;
  }

  const complete = Boolean(
    profile.data.display_name.trim() && profile.data.username,
  );

  if (!complete && !onboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (complete && onboardingRoute) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
