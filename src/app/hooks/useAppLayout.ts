import { useMatch } from "react-router-dom";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { useMusicOnboarding } from "@/features/preferences/hooks/useMusicOnboarding";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { profileSchema } from "@/features/profile/lib/profileValidation";
import { isLocalAuthBypassEnabled } from "@/shared/lib/localDevelopment";

export function useAppLayout() {
  const status = useAuthStore((state) => state.status);

  const authRoute = useMatch("/auth/*");

  const onboardingRoute = useMatch("/onboarding/*");

  const musicRoute = useMatch("/musicOnboarding/*");

  const profile = useProfile();

  const complete =
    profile.isSuccess &&
    profileSchema.safeParse({
      displayName: profile.data.display_name,
      username: profile.data.username,
      bio: profile.data.bio,
    }).success;

  const music = useMusicOnboarding(status === "authenticated" && complete);

  const canAccessApp =
    status === "authenticated"
      ? complete && music.isSuccess && music.data !== null
      : isLocalAuthBypassEnabled;

  return {
    requiresLogin:
      !isLocalAuthBypassEnabled && status === "anonymous" && authRoute === null,

    showNavigation:
      canAccessApp &&
      authRoute === null &&
      onboardingRoute === null &&
      musicRoute === null,
  };
}
