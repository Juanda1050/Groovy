import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { getMusicOnboarding } from "@/features/preferences/services/musicOnboardingService";

export function musicOnboardingKey(userId: string | null) {
  return ["musicOnboarding", userId] as const;
}

export function useMusicOnboarding(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: musicOnboardingKey(userId),

    enabled: enabled && Boolean(userId),

    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error("AUTH_REQUIRED");
      }

      return getMusicOnboarding(userId, signal);
    },

    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
