import { useMatch } from "react-router-dom";
import { isLocalAuthBypassEnabled } from "@/lib/localDevelopment";
import { useAuthStore } from "@/stores/authStore";

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
