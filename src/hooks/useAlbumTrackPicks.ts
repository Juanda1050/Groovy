import { useEffect, useState } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/app/queryClient";
import { useAlbumLibrary } from "@/hooks/useAlbumStatus";
import { albumWriteKey } from "@/lib/albumQueries";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/lib/libraryErrors";
import { getTrackPicks, saveTrackPick } from "@/services/trackPicksService";
import { useAuthStore } from "@/stores/authStore";

import type {
  LibraryTrack,
  SaveTrackPickInput,
  TrackPick,
  TrackPreference,
} from "@/models/trackPicks";

function trackErrorKey(error: unknown): string {
  const code = getLibraryErrorCode(error);

  if (
    code === "AUTH_REQUIRED" ||
    code === "UNAUTHORIZED" ||
    code === "SESSION_EXPIRED"
  ) {
    return "session";
  }

  if (code === "RATE_LIMITED") return "rate";
  if (code === "TOO_MANY_TRACK_PICKS") return "limit";

  if (code === "ALBUM_NOT_LISTENED" || code === "ALBUM_NOT_SAVED") {
    return "listened";
  }

  return "save";
}

export function useAlbumTrackPicks(albumId: string) {
  const library = useAlbumLibrary(albumId);
  const client = useQueryClient();
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const { userId } = library;
  const album = library.query.data;
  const listened = album?.status === "listened";
  const writeKey = albumWriteKey(userId, albumId);
  const writes = useIsMutating({ mutationKey: writeKey });

  const query = useQuery({
    queryKey: [
      "albumTrackPicks",
      userId,
      albumId,
      album?.updated_at ?? null,
      album?.status ?? null,
    ],
    enabled: Boolean(userId && album && listened),
    queryFn: ({ signal }) => {
      if (!userId || !album) {
        throw new Error("AUTH_REQUIRED");
      }

      return getTrackPicks({
        userId,
        userAlbumId: album.id,
        signal,
      });
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  const mutation = useMutation({
    mutationKey: writeKey,
    mutationFn: saveTrackPick,
    retry: false,
    onMutate: async (request) => {
      await client.cancelQueries({
        queryKey: ["albumTrackPicks", request.userId, request.albumId],
      });
    },
    onSuccess: (picks, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) {
        return;
      }

      client.setQueriesData<TrackPick[]>(
        {
          queryKey: ["albumTrackPicks", request.userId, request.albumId],
        },
        picks,
      );
    },
    onError: (error) => {
      if (getLibraryErrorCode(error) === "RATE_LIMITED") {
        setRemainingSeconds(getLibraryRetrySeconds(error));
      }
    },
  });

  const disabled =
    library.disabled ||
    !listened ||
    !query.isSuccess ||
    query.isFetching ||
    writes > 0 ||
    remainingSeconds > 0;

  const preferences = new Map(
    (query.data ?? []).map((pick) => [pick.spotify_track_id, pick.preference]),
  );

  function onSelect(trackId: string, preference: TrackPreference): void {
    if (
      disabled ||
      !userId ||
      useAuthStore.getState().user?.id !== userId ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    const request: SaveTrackPickInput = {
      userId,
      albumId,
      trackId,
      preference: preferences.get(trackId) === preference ? null : preference,
    };

    mutation.mutate(request);
  }

  return {
    preferences,
    listened,
    disabled,
    loading: library.query.isPending || (listened && query.isPending),
    readError: library.query.isError || (listened && query.isError),
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    saveError: mutation.isError,
    savingTrackId: mutation.isPending ? mutation.variables.trackId : null,
    errorKey: trackErrorKey(mutation.error),
    remainingSeconds,
    onSelect,
    onRetry: () => {
      if (library.query.isError) {
        library.onRetry();
      } else {
        void query.refetch();
      }
    },
  };
}

export function useLibraryTrackPick(item: LibraryTrack) {
  const { t } = useTranslation("trackPicks");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const writeKey = albumWriteKey(userId, item.albumId);
  const writes = useIsMutating({ mutationKey: writeKey });
  const [blockedUntil, setBlockedUntil] = useState(0);

  useEffect(() => {
    if (blockedUntil === 0) return;

    const delay = Math.max(0, blockedUntil - Date.now());

    const timer = window.setTimeout(() => {
      setBlockedUntil(0);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [blockedUntil]);

  const mutation = useMutation({
    mutationKey: writeKey,
    mutationFn: saveTrackPick,
    retry: false,
    onMutate: async (request) => {
      await Promise.all([
        client.cancelQueries({
          queryKey: ["likedAlbums", request.userId],
        }),
        client.cancelQueries({
          queryKey: ["albumTrackPicks", request.userId, request.albumId],
        }),
      ]);
    },
    onSuccess: (picks, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) {
        return;
      }

      client.setQueriesData<TrackPick[]>(
        {
          queryKey: ["albumTrackPicks", request.userId, request.albumId],
        },
        picks,
      );
    },
    onError: (error, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) {
        return;
      }

      const limited = getLibraryErrorCode(error) === "RATE_LIMITED";

      const seconds = limited ? getLibraryRetrySeconds(error) : 0;

      if (limited) {
        setBlockedUntil(Date.now() + seconds * 1000);
      }

      toast.add({
        type: "error",
        title: t(`errors.${trackErrorKey(error)}`),
        timeout: 5000,
        ...(limited
          ? {
              description: t("retryAfter", {
                count: seconds,
              }),
            }
          : {}),
      });

      void client.invalidateQueries({
        queryKey: ["likedAlbums", request.userId],
      });

      void client.invalidateQueries({
        queryKey: ["albumTrackPicks", request.userId, request.albumId],
      });
    },
  });

  const disabled = !userId || writes > 0 || blockedUntil !== 0;

  function onChange(preference: TrackPreference): void {
    if (
      disabled ||
      !userId ||
      useAuthStore.getState().user?.id !== userId ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    mutation.mutate({
      userId,
      albumId: item.albumId,
      trackId: item.trackId,
      preference: preference === item.preference ? null : preference,
    });
  }

  return {
    disabled,
    saving: mutation.isPending,
    onChange,
  };
}
