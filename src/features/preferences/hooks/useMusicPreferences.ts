import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/features/library/lib/libraryErrors";
import {
  getMusicPreferences,
  setMusicPreference,
} from "@/features/preferences/services/musicPreferenceService";
import type { AlbumFeedCursor, AlbumFeedPage } from "@/models/library";
import type {
  MusicEntityType,
  MusicPreferenceAction,
  MusicPreferenceBatch,
} from "@/models/musicPreferences";

export function useMusicPreferences(
  entityType: MusicEntityType,
  spotifyIds: readonly string[],
) {
  const { t } = useTranslation("common");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const ids = [...new Set(spotifyIds)].sort();
  const prefix = ["musicPreferences", userId, entityType];
  const writeKey = ["musicPreferenceWrite", userId];
  const writes = useIsMutating({ mutationKey: writeKey });
  const [cooldown, setCooldown] = useState({ userId, until: 0 });
  const blockedUntil = cooldown.userId === userId ? cooldown.until : 0;

  useEffect(() => {
    if (!blockedUntil) return;

    const timer = window.setTimeout(
      () => {
        setCooldown((current) =>
          current.userId === userId && current.until === blockedUntil
            ? { userId, until: 0 }
            : current,
        );
      },
      Math.max(0, blockedUntil - Date.now()),
    );

    return () => window.clearTimeout(timer);
  }, [userId, blockedUntil]);

  const query = useQuery({
    queryKey: [...prefix, ids],
    enabled: Boolean(userId) && ids.length > 0,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return getMusicPreferences({
        userId,
        entityType,
        spotifyIds: ids,
        signal,
      });
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  async function invalidateLists(
    ownerId: string,
    entity: MusicEntityType,
  ): Promise<void> {
    if (useAuthStore.getState().user?.id !== ownerId) return;

    await client.invalidateQueries({
      queryKey:
        entity === "album"
          ? ["library", ownerId]
          : ["musicPreferences", ownerId, entity, "libraryPage"],
    });
  }

  function notifyAlbumFeed(ownerId: string): void {
    if (useAuthStore.getState().user?.id !== ownerId) return;

    void client.invalidateQueries({
      queryKey: ["albumFeed", ownerId],
      refetchType: "none",
    });

    client.setQueryData<number>(
      ["albumFeedSignal", ownerId],
      (previous = 0) => previous + 1,
    );
  }

  const mutation = useMutation({
    mutationKey: writeKey,
    mutationFn: setMusicPreference,
    retry: false,

    onMutate: async (request) => {
      const cancellations = [
        client.cancelQueries({
          queryKey: ["musicPreferences", request.userId, request.entityType],
        }),
      ];

      if (request.entityType === "album") {
        cancellations.push(
          client.cancelQueries({
            queryKey: ["library", request.userId],
          }),
          client.cancelQueries({
            queryKey: ["albumFeed", request.userId],
          }),
        );
      }

      await Promise.all(cancellations);
    },

    onSuccess: async (saved, request) => {
      const queryKey = ["musicPreferences", request.userId, request.entityType];

      await client.cancelQueries({ queryKey });

      if (useAuthStore.getState().user?.id !== request.userId) return;

      client.setQueriesData<MusicPreferenceBatch>({ queryKey }, (previous) => {
        if (!previous || !Object.hasOwn(previous, saved.spotify_id)) {
          return previous;
        }

        const current = previous[saved.spotify_id];

        if (current && current.revision > saved.revision) return previous;

        return { ...previous, [saved.spotify_id]: saved };
      });

      if (request.entityType === "album") {
        await client.cancelQueries({
          queryKey: ["albumFeed", request.userId],
        });

        if (useAuthStore.getState().user?.id !== request.userId) return;

        if (!saved.is_favorite) {
          client.setQueriesData<
            InfiniteData<AlbumFeedPage, AlbumFeedCursor | null>
          >({ queryKey: ["albumFeed", request.userId] }, (previous) =>
            previous
              ? {
                  ...previous,
                  pages: previous.pages.map((page) => ({
                    ...page,
                    items: page.items.filter(
                      (post) =>
                        post.user_id !== request.userId ||
                        post.spotify_album_id !== saved.spotify_id ||
                        post.post_kind !== "favorite",
                    ),
                  })),
                }
              : previous,
          );
        }

        notifyAlbumFeed(request.userId);
      }

      toast.add({
        type: "success",
        title: t("notifications.saved"),
        timeout: 2600,
      });

      await invalidateLists(request.userId, request.entityType);
    },

    onError: async (error, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      const code = getLibraryErrorCode(error);
      const limited = code === "RATE_LIMITED";

      if (limited) {
        setCooldown({
          userId: request.userId,
          until: Date.now() + getLibraryRetrySeconds(error) * 1000,
        });
      }

      const key = ["AUTH_REQUIRED", "SESSION_EXPIRED", "UNAUTHORIZED"].includes(
        code,
      )
        ? "session"
        : code === "MUSIC_PREFERENCE_CONFLICT"
          ? "conflict"
          : code === "FAVORITE_REQUIRES_LIKE"
            ? "favoriteRequiresLike"
            : limited
              ? "rate"
              : "save";

      toast.add({
        type: "error",
        title: t(`musicPreferences.errors.${key}`),
        timeout: 5000,
      });

      const queryKey = ["musicPreferences", request.userId, request.entityType];

      await client.cancelQueries({ queryKey });

      if (useAuthStore.getState().user?.id !== request.userId) return;

      await client.invalidateQueries({ queryKey });
      await invalidateLists(request.userId, request.entityType);

      if (request.entityType === "album") {
        notifyAlbumFeed(request.userId);
      }
    },
  });

  const disabled =
    !userId ||
    !query.isSuccess ||
    query.isFetching ||
    writes > 0 ||
    blockedUntil > 0;

  function onChange(
    spotifyId: string,
    action: MusicPreferenceAction,
    active: boolean,
  ): void {
    if (
      disabled ||
      !userId ||
      !query.data ||
      !Object.hasOwn(query.data, spotifyId) ||
      (entityType !== "track" && action !== "favorite") ||
      useAuthStore.getState().user?.id !== userId ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    mutation.mutate({
      userId,
      entityType,
      spotifyId,
      action,
      active,
      expectedRevision: query.data[spotifyId]?.revision ?? 0,
    });
  }

  return {
    preferences: query.data,
    loading: Boolean(userId) && ids.length > 0 && query.isPending,
    readError: query.isError,
    fetching: query.isFetching,
    saving: writes > 0,
    disabled,
    blockedUntil,
    onChange,
    onRetry: () => {
      if (
        userId &&
        ids.length > 0 &&
        useAuthStore.getState().user?.id === userId
      ) {
        void query.refetch();
      }
    },
  };
}
