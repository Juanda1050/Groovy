import { useQuery } from "@tanstack/react-query";
import { getUserSettings } from "@/services/settingsService";
import { useAuthStore } from "@/stores/authStore";

export function useUserSettings() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: ["userSettings", userId],
    enabled: userId !== null,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error("Authentication required.");
      }

      return getUserSettings(userId, signal);
    },
  });
}
