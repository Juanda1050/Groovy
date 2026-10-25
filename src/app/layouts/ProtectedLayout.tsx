import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { profileSchema } from "@/features/profile/lib/profileValidation";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { isLocalAuthBypassEnabled } from "@/shared/lib/localDevelopment";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useMatch } from "react-router-dom";

export default function ProtectedLayout() {
  const status = useAuthStore((state) => state.status);
  const profile = useProfile();
  const onboardingRoute = useMatch("/onboarding");
  const { t } = useTranslation("profile");

  if (isLocalAuthBypassEnabled && status !== "authenticated") {
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

  const complete = profileSchema.safeParse({
    displayName: profile.data.display_name,
    username: profile.data.username,
    bio: profile.data.bio,
  }).success;

  if (!complete && !onboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (complete && onboardingRoute) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
