import { useQuery } from "@tanstack/react-query";
import { getProfile, getUserSettings } from "@/services/profileService";
import { useAuthStore } from "@/stores/authStore";

const accountStaleTime = 5 * 60_000;

export function profileKey(userId: string | null) {
  return ["profile", userId] as const;
}

export function userSettingsKey(userId: string | null) {
  return ["userSettings", userId] as const;
}

export function useProfile() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: profileKey(userId),
    enabled: userId !== null,
    staleTime: accountStaleTime,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Authentication required.");

      return getProfile(userId, signal);
    },
  });
}

export function useUserSettings() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: userSettingsKey(userId),
    enabled: userId !== null,
    staleTime: accountStaleTime,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Authentication required.");

      return getUserSettings(userId, signal);
    },
  });
}
