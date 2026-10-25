import { useAuthStore } from "@/features/auth/stores/authStore";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { profileSchema } from "@/features/profile/lib/profileValidation";
import { isLocalAuthBypassEnabled } from "@/shared/lib/localDevelopment";
import { useMatch } from "react-router-dom";

export function useAppLayout() {
  const status = useAuthStore((state) => state.status);
  const authRoute = useMatch("/auth/*");
  const onboardingRoute = useMatch("/onboarding/*");
  const profile = useProfile();

  const complete =
    profile.isSuccess &&
    profileSchema.safeParse({
      displayName: profile.data.display_name,
      username: profile.data.username,
      bio: profile.data.bio,
    }).success;

  const canAccessApp =
    status === "authenticated" ? complete : isLocalAuthBypassEnabled;

  return {
    requiresLogin:
      !isLocalAuthBypassEnabled && status === "anonymous" && authRoute === null,

    showNavigation:
      canAccessApp && authRoute === null && onboardingRoute === null,
  };
}
