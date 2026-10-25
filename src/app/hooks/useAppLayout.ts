import { useAuthStore } from "@/features/auth/stores/authStore";
import { isLocalAuthBypassEnabled } from "@/shared/lib/localDevelopment";
import { useMatch } from "react-router-dom";

export function useAppLayout() {
  const status = useAuthStore((state) => state.status);
  const authRoute = useMatch("/auth/*");
  const onboardingRoute = useMatch("/onboarding/*");

  const canAccessApp = isLocalAuthBypassEnabled || status === "authenticated";

  return {
    requiresLogin:
      !isLocalAuthBypassEnabled && status === "anonymous" && authRoute === null,

    showNavigation:
      canAccessApp && authRoute === null && onboardingRoute === null,
  };
}
