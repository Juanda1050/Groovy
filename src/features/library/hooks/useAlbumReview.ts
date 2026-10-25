import { useAlbumLibrary } from "@/features/library/hooks/useAlbumStatus";
import { countReviewCharacters,normalizeReview,resolveReviewLanguage,reviewMaxLength } from "@/features/library/lib/reviewText";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function useAlbumReview(albumId: string, active: boolean) {
  const { i18n } = useTranslation("review");
  const library = useAlbumLibrary(albumId);
  const { query, mutation, userId, errorCode } = library;
  const [draft, setDraft] = useState<string | undefined>();

  const language = resolveReviewLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );

  const storedText = query.data?.review ?? "";
  const text = draft ?? storedText;
  const normalizedText = normalizeReview(text);
  const characterCount = countReviewCharacters(text);
  const tooLong = characterCount > reviewMaxLength;
  const dirty = normalizedText !== normalizeReview(storedText);
  const listened = query.data?.status === "listened";

  const editable =
    active &&
    userId !== null &&
    query.isSuccess &&
    listened &&
    !query.isFetching &&
    library.writes === 0;

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
    if (!userId || !editable || !dirty || tooLong) return false;

    const saved = await library.onWrite({
      action: "review",
      userId,
      albumId,
      review: normalizedText,
      language,
    });

    if (saved) setDraft(undefined);

    return saved;
  }

  function onDiscard(): void {
    if (library.writes > 0) return;

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
    remainingSeconds: library.remainingSeconds,
    canSave: editable && dirty && !tooLong && library.remainingSeconds === 0,
    onChange,
    onSave,
    onDiscard,
    onRetry: library.onRetry,
  };
}
