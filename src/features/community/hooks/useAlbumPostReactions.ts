import { useInfiniteQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAlbumPostReactions } from "@/features/community/services/communityService";

import type { AlbumFeedCursor } from "@/models/library";

export function useAlbumPostReactions(
  postId: string,
  open: boolean,
  count: number,
) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const query = useInfiniteQuery({
    queryKey: ["postReactions", userId, postId, count],
    enabled: open && Boolean(userId),
    initialPageParam: null as AlbumFeedCursor | null,

    queryFn: ({ pageParam, signal }) => {
      if (!userId) {
        throw new Error("AUTH_REQUIRED");
      }

      return getAlbumPostReactions(userId, postId, pageParam, signal);
    },

    getNextPageParam: (page) => page.nextCursor ?? undefined,

    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const items = [
    ...new Map(
      (query.data?.pages ?? [])
        .flatMap((page) => page.items)
        .map((item) => [item.id, item]),
    ).values(),
  ];

  return {
    ...query,
    items,
  };
}
