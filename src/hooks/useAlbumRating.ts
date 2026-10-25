import { useEffect, useState } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/lib/libraryErrors";
import { getAlbumRating, saveAlbumRating } from "@/services/albumRatingService";
import { useAuthStore } from "@/stores/authStore";
import type { AlbumRatingRecord } from "@/models/albumRating";
import type { CatalogRatings } from "@/models/catalog";
import type { LibraryPageResult } from "@/models/libraryView";

export function useAlbumRating(albumId: string) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const writeKey = ["albumWrite", userId, albumId] as const;
  const writes = useIsMutating({ mutationKey: writeKey });

  const query = useQuery({
    queryKey: ["albumRating", userId, albumId],
    enabled: userId !== null,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return getAlbumRating(userId, albumId, signal);
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    mutationFn: saveAlbumRating,
    retry: false,
    onMutate: async (request) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ["albumRating", request.userId, request.albumId],
        }),
        queryClient.cancelQueries({
          queryKey: ["catalogRatings", request.userId],
        }),
      ]);
    },
    onSuccess: (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      queryClient.setQueryData<AlbumRatingRecord>(
        ["albumRating", request.userId, request.albumId],
        saved,
      );

      queryClient.setQueriesData<CatalogRatings>(
        { queryKey: ["catalogRatings", request.userId] },
        (previous) =>
          previous && request.albumId in previous
            ? { ...previous, [request.albumId]: saved.rating }
            : previous,
      );

      queryClient.setQueriesData<LibraryPageResult>(
        { queryKey: ["library", request.userId] },
        (previous) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((item) =>
                  item.spotifyAlbumId === request.albumId
                    ? { ...item, rating: saved.rating }
                    : item,
                ),
              }
            : previous,
      );

      void queryClient.invalidateQueries({
        queryKey: ["library", request.userId],
      });
    },
    onError: (error) => {
      if (getLibraryErrorCode(error) === "RATE_LIMITED") {
        setRemainingSeconds(getLibraryRetrySeconds(error));
      }
    },
  });

  const storedValue = query.data?.rating ?? null;

  const value = mutation.isPending ? mutation.variables.rating : storedValue;

  const listened = query.data?.status === "listened";

  const disabled =
    !userId ||
    !query.isSuccess ||
    !listened ||
    query.isFetching ||
    writes > 0 ||
    remainingSeconds > 0;

  const errorCode = getLibraryErrorCode(mutation.error);

  const errorKey =
    errorCode === "RATE_LIMITED"
      ? "rateError"
      : errorCode === "AUTH_REQUIRED" || errorCode === "UNAUTHORIZED"
        ? "sessionError"
        : errorCode === "ALBUM_NOT_LISTENED" || errorCode === "ALBUM_NOT_SAVED"
          ? "statusChanged"
          : "saveError";

  function onSelect(nextValue: number): void {
    if (
      !userId ||
      disabled ||
      nextValue === storedValue ||
      !Number.isInteger(nextValue) ||
      nextValue < 2 ||
      nextValue > 10 ||
      queryClient.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    mutation.mutate({
      userId,
      albumId,
      rating: nextValue,
    });
  }

  return {
    value,
    loading: query.isPending,
    reading: query.isFetching,
    readError: query.isError,
    listened,
    disabled,
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    saveError: mutation.isError,
    errorKey,
    remainingSeconds,
    onSelect,
    onRetry: () => {
      void query.refetch();
    },
  };
}
