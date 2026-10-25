import { useEffect, useState } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  albumLibraryKey,
  albumLibraryOptions,
  albumWriteKey,
  syncAlbumLibrary,
} from "@/lib/albumQueries";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/lib/libraryErrors";
import { saveUserAlbum } from "@/services/libraryService";
import { useAuthStore } from "@/stores/authStore";
import type { ListeningStatus } from "@/models/catalog";
import type { AlbumWriteRequest } from "@/models/library";

export function useAlbumLibrary(albumId: string) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const writeKey = albumWriteKey(userId, albumId);
  const writes = useIsMutating({ mutationKey: writeKey });
  const query = useQuery(albumLibraryOptions(userId, albumId));

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  const mutation = useMutation({
    mutationKey: writeKey,
    mutationFn: saveUserAlbum,
    retry: false,
    onMutate: async (request) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: albumLibraryKey(request.userId, request.albumId),
        }),
        queryClient.cancelQueries({
          queryKey: ["catalogRatings", request.userId],
        }),
        queryClient.cancelQueries({
          queryKey: ["albumSearch", request.userId],
        }),
      ]);
    },
    onSuccess: (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      syncAlbumLibrary(queryClient, saved);
    },
    onError: (error) => {
      if (getLibraryErrorCode(error) === "RATE_LIMITED") {
        setRemainingSeconds(getLibraryRetrySeconds(error));
      }
    },
  });

  const disabled =
    !userId ||
    !query.isSuccess ||
    query.isFetching ||
    writes > 0 ||
    remainingSeconds > 0;

  async function onWrite(request: AlbumWriteRequest): Promise<boolean> {
    if (
      disabled ||
      request.userId !== userId ||
      request.albumId !== albumId ||
      useAuthStore.getState().user?.id !== userId ||
      queryClient.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return false;
    }

    try {
      await mutation.mutateAsync(request);
      return true;
    } catch {
      return false;
    }
  }

  return {
    userId,
    query,
    mutation,
    writes,
    disabled,
    remainingSeconds,
    errorCode: getLibraryErrorCode(mutation.error),
    onWrite,
    onRetry: () => {
      void query.refetch();
    },
  };
}

export function useAlbumStatus(albumId: string) {
  const library = useAlbumLibrary(albumId);
  const { query, mutation, userId, errorCode } = library;

  const currentStatus = query.data?.status ?? null;

  const errorKey =
    errorCode === "AUTH_REQUIRED" ||
    errorCode === "UNAUTHORIZED" ||
    errorCode === "SESSION_EXPIRED"
      ? "status.sessionError"
      : errorCode === "RATE_LIMITED"
        ? "status.rateError"
        : errorCode === "SPOTIFY_QUOTA" || errorCode === "SPOTIFY_UNAVAILABLE"
          ? "status.spotifyError"
          : "status.saveError";

  function onChange(status: ListeningStatus): void {
    if (!userId || status === currentStatus) return;

    void library.onWrite({
      action: "status",
      userId,
      albumId,
      status,
      isNew: query.data === null,
    });
  }

  return {
    currentStatus,
    loading: query.isPending,
    reading: query.isFetching,
    readError: query.isError,
    saving: mutation.isPending,
    savingStatus:
      mutation.isPending && mutation.variables.action === "status"
        ? mutation.variables.status
        : null,
    saved: mutation.isSuccess,
    saveError: mutation.isError,
    errorKey,
    remainingSeconds: library.remainingSeconds,
    disabled: library.disabled,
    onChange,
    onRetry: library.onRetry,
  };
}
