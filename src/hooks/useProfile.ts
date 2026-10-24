import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/services/profileService";
import { useAuthStore } from "@/stores/authStore";

export function useProfile() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: ["profile", userId],
    enabled: userId !== null,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error("Authentication required.");
      }

      return getProfile(userId, signal);
    },
  });
}
