import { useAuthStore } from "@/features/auth/stores/authStore";
import { getPublicProfile,searchPublicProfiles } from "@/features/community/services/communityService";
import {
useQuery,
useQueryClient
} from "@tanstack/react-query";
import { useEffect,useState } from "react";

export function usePublicProfile(profileId: string) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: ["publicProfile", userId, profileId],
    enabled: Boolean(userId && profileId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");
      return getPublicProfile(userId, profileId, signal);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

export function useCommunityUserSearch(value: string, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();

  const term = value
    .trim()
    .replace(/^@+/u, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLowerCase();

  const length = [...term].length;
  const canSearch = enabled && Boolean(userId) && length >= 2 && length <= 50;

  const [debounced, setDebounced] = useState({ userId, term: "" });
  const waiting =
    canSearch && (debounced.userId !== userId || debounced.term !== term);

  useEffect(() => {
    if (!canSearch) return;
    const timer = window.setTimeout(() => setDebounced({ userId, term }), 300);
    return () => window.clearTimeout(timer);
  }, [canSearch, userId, term]);

  const query = useQuery({
    queryKey: ["profileSearch", userId, term],
    enabled: canSearch && !waiting,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      const page = await searchPublicProfiles(userId, term, signal);
      signal.throwIfAborted();

      if (useAuthStore.getState().user?.id !== userId) {
        throw new Error("AUTH_REQUIRED");
      }

      for (const item of page.items) {
        client.setQueryData(["feedProfile", userId, item.id], {
          id: item.id,
          display_name: item.display_name,
          username: item.username,
          avatar_url: item.avatar_url,
        });
      }

      return page;
    },
  });

  return {
    canSearch,
    items: canSearch ? (query.data?.items ?? []) : [],
    hasMore: canSearch && Boolean(query.data?.hasMore),
    loading: canSearch && !query.data && (waiting || query.isPending),
    fetching: query.isFetching,
    error: canSearch && !waiting && query.isError,
    canRetry: canSearch && !waiting && !query.isFetching,
    onRetry: () => {
      if (canSearch && !waiting) void query.refetch();
    },
  };
}
