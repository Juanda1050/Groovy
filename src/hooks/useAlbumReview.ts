import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  countReviewCharacters,
  normalizeReview,
  resolveReviewLanguage,
  reviewMaxLength,
} from "@/lib/reviewText";
import { getAlbumReview, saveAlbumReview } from "@/services/albumReviewService";
import { useAuthStore } from "@/stores/authStore";
import type { AlbumReviewRecord } from "@/models/albumReview";
import type { LibraryPageResult } from "@/models/libraryView";

export function useAlbumReview(albumId: string, active: boolean) {
  const { i18n } = useTranslation("review");
  const language = resolveReviewLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );

  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | undefined>();
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const writeKey = ["albumWrite", userId, albumId] as const;
  const writes = useIsMutating({ mutationKey: writeKey });

  const query = useQuery({
    queryKey: ["albumReview", userId, albumId],
    enabled: active && userId !== null,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return getAlbumReview(userId, albumId, signal);
    },
    staleTime: 60_000,
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
    mutationFn: saveAlbumReview,
    retry: false,
    onMutate: async (request) => {
      await queryClient.cancelQueries({
        queryKey: ["albumReview", request.userId, request.albumId],
      });
    },
    onSuccess: (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      queryClient.setQueryData<AlbumReviewRecord>(
        ["albumReview", request.userId, request.albumId],
        saved,
      );

      queryClient.setQueriesData<LibraryPageResult>(
        { queryKey: ["library", request.userId] },
        (previous) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((item) =>
                  item.spotifyAlbumId === request.albumId
                    ? { ...item, hasReview: Boolean(saved.review) }
                    : item,
                ),
              }
            : previous,
      );

      void queryClient.invalidateQueries({
        queryKey: ["library", request.userId],
      });

      setDraft(undefined);
    },
    onError: (error) => {
      if (getLibraryErrorCode(error) === "RATE_LIMITED") {
        setRemainingSeconds(getLibraryRetrySeconds(error));
      }
    },
  });

  const storedText = query.data?.review ?? "";
  const text = draft ?? storedText;
  const normalizedText = normalizeReview(text);
  const characterCount = countReviewCharacters(text);
  const tooLong = characterCount > reviewMaxLength;

  const dirty = normalizedText !== normalizeReview(storedText);
  const listened = query.data?.status === "listened";

  const editable =
    userId !== null &&
    query.isSuccess &&
    listened &&
    !query.isFetching &&
    writes === 0;

  const errorCode = getLibraryErrorCode(mutation.error);

  const errorKey =
    errorCode === "RATE_LIMITED"
      ? "errors.rate"
      : errorCode === "AUTH_REQUIRED" || errorCode === "UNAUTHORIZED"
        ? "errors.session"
        : errorCode === "ALBUM_NOT_LISTENED" || errorCode === "ALBUM_NOT_SAVED"
          ? "errors.statusChanged"
          : errorCode === "REVIEW_TOO_LONG"
            ? "errors.tooLong"
            : errorCode === "REVIEW_APPEARS_SPANISH"
              ? "errors.appearsSpanish"
              : errorCode === "REVIEW_APPEARS_ENGLISH"
                ? "errors.appearsEnglish"
                : "errors.save";

  function onChange(value: string): void {
    if (!editable) return;

    mutation.reset();
    setDraft(value);
  }

  async function onSave(): Promise<boolean> {
    if (
      !userId ||
      !editable ||
      !dirty ||
      tooLong ||
      remainingSeconds > 0 ||
      queryClient.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return false;
    }

    try {
      await mutation.mutateAsync({
        userId,
        albumId,
        review: normalizedText,
        language,
      });

      return true;
    } catch {
      return false;
    }
  }

  function onDiscard(): void {
    if (writes > 0) return;

    setDraft(undefined);
    mutation.reset();
  }

  return {
    text,
    storedText,
    dirty,
    characterCount,
    maxLength: reviewMaxLength,
    tooLong,
    language,
    editable,
    listened,
    removing: dirty && normalizedText === "",
    loading: query.isPending,
    reading: query.isFetching,
    readError: query.isError,
    saving: mutation.isPending,
    saveError: mutation.isError,
    errorKey,
    remainingSeconds,
    canSave: editable && dirty && !tooLong && remainingSeconds === 0,
    onChange,
    onSave,
    onDiscard,
    onRetry: () => {
      void query.refetch();
    },
  };
}
