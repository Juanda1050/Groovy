import { useEffect, useRef, useState } from "react";
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
import {
  changeAlbumStatus,
  getAlbumStatus,
} from "@/services/albumStatusService";
import { useAuthStore } from "@/stores/authStore";
import type { CatalogPage, ListeningStatus } from "@/models/catalog";

export function useAlbumStatus(albumId: string) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const lock = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const writeKey = ["albumWrite", userId, albumId] as const;
  const writes = useIsMutating({ mutationKey: writeKey });

  const status = useQuery({
    queryKey: ["albumLibraryStatus", userId, albumId],
    enabled: userId !== null && /^[A-Za-z0-9]{22}$/.test(albumId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return getAlbumStatus(userId, albumId, signal);
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
    mutationFn: changeAlbumStatus,
    retry: false,
    onMutate: async (request) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ["albumSearch", request.userId],
        }),
        queryClient.cancelQueries({
          queryKey: ["albumLibraryStatus", request.userId, request.albumId],
        }),
        queryClient.cancelQueries({
          queryKey: ["albumRating", request.userId, request.albumId],
        }),
      ]);
    },
    onSuccess: (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      queryClient.setQueryData<ListeningStatus | null>(
        ["albumLibraryStatus", request.userId, request.albumId],
        saved.status,
      );

      queryClient.setQueriesData<CatalogPage>(
        { queryKey: ["albumSearch", request.userId] },
        (previous) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((album) =>
                  album.id === saved.spotifyAlbumId
                    ? { ...album, libraryStatus: saved.status }
                    : album,
                ),
              }
            : previous,
      );

      void queryClient.invalidateQueries({
        queryKey: ["albumRating", request.userId, request.albumId],
        refetchType: "none",
      });

      void queryClient.invalidateQueries({
        queryKey: ["library", request.userId],
      });
    },
    onError: (error) => {
      if (getLibraryErrorCode(error) === "RATE_LIMITED") {
        setRemainingSeconds(getLibraryRetrySeconds(error));
      }
    },
    onSettled: () => {
      lock.current = false;
    },
  });

  const currentStatus = status.data ?? null;
  const code = getLibraryErrorCode(mutation.error);

  const errorKey =
    code === "AUTH_REQUIRED" ||
    code === "UNAUTHORIZED" ||
    code === "SESSION_EXPIRED"
      ? "status.sessionError"
      : code === "RATE_LIMITED"
        ? "status.rateError"
        : code === "SPOTIFY_QUOTA" || code === "SPOTIFY_UNAVAILABLE"
          ? "status.spotifyError"
          : "status.saveError";

  function onChange(nextStatus: ListeningStatus): void {
    if (
      !userId ||
      lock.current ||
      !status.isSuccess ||
      status.isFetching ||
      remainingSeconds > 0 ||
      nextStatus === currentStatus ||
      queryClient.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    lock.current = true;

    mutation.mutate({
      albumId,
      userId,
      status: nextStatus,
      isNew: currentStatus === null,
    });
  }

  return {
    currentStatus,
    loading: status.isPending,
    reading: status.isFetching,
    readError: status.isError,
    saving: mutation.isPending,
    savingStatus: mutation.isPending ? mutation.variables.status : null,
    saved: mutation.isSuccess,
    saveError: mutation.isError,
    errorKey,
    remainingSeconds,
    disabled:
      !userId ||
      !status.isSuccess ||
      status.isFetching ||
      writes > 0 ||
      remainingSeconds > 0,
    onChange,
    onRetry: () => {
      void status.refetch();
    },
  };
}
