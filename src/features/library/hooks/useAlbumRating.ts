import { useAlbumLibrary } from "@/features/library/hooks/useAlbumStatus";

export function useAlbumRating(albumId: string) {
  const library = useAlbumLibrary(albumId);
  const { query, mutation, userId, errorCode } = library;

  const storedValue = query.data?.rating ?? null;

  const value =
    mutation.isPending && mutation.variables.action === "rating"
      ? mutation.variables.rating
      : storedValue;

  const listened = query.data?.status === "listened";

  const errorKey =
    errorCode === "RATE_LIMITED"
      ? "rateError"
      : errorCode === "AUTH_REQUIRED" || errorCode === "UNAUTHORIZED"
        ? "sessionError"
        : errorCode === "ALBUM_NOT_LISTENED" || errorCode === "ALBUM_NOT_SAVED"
          ? "statusChanged"
          : "saveError";

  function onSelect(rating: number): void {
    if (
      !userId ||
      !listened ||
      rating === storedValue ||
      !Number.isInteger(rating) ||
      rating < 2 ||
      rating > 10
    ) {
      return;
    }

    void library.onWrite({
      action: "rating",
      userId,
      albumId,
      rating,
    });
  }

  return {
    value,
    loading: query.isPending,
    reading: query.isFetching,
    readError: query.isError,
    listened,
    disabled: library.disabled || !listened,
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    saveError: mutation.isError,
    errorKey,
    remainingSeconds: library.remainingSeconds,
    onSelect,
    onRetry: library.onRetry,
  };
}
