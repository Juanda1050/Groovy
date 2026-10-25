import { useAlbumReview } from "@/features/library/hooks/useAlbumReview";
import type { AlbumReviewProps } from "@/models/albumDetail";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Pencil } from "lucide-react";
import { useId,useState } from "react";
import { useTranslation } from "react-i18next";

export function AlbumReview({ albumId }: AlbumReviewProps) {
  const { t } = useTranslation("review");
  const [editing, setEditing] = useState(false);
  const review = useAlbumReview(albumId, true);

  const inputId = useId();
  const feedbackId = useId();
  const countId = useId();

  const hasReview = review.storedText.trim().length > 0;

  if (review.loading) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 py-2 text-xs text-muted-foreground"
      >
        <RecordLoader size="sm" />
        {t("loading")}
      </div>
    );
  }

  if (review.readError) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-xs text-muted-foreground">
          {t("errors.read")}
        </p>

        <LoadingButton
          type="button"
          variant="ghost"
          className="min-h-11 px-2 text-xs"
          loading={review.reading}
          loadingLabel={t("loading")}
          onClick={review.onRetry}
        >
          {t("retry")}
        </LoadingButton>
      </div>
    );
  }

  if (!review.listened) {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        {t("errors.statusChanged")}
      </p>
    );
  }

  if (!editing) {
    return (
      <section
        aria-label={t("label")}
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
      >
        <p
          className={
            hasReview
              ? "min-w-0 wrap-break-word py-2 text-sm leading-7 text-foreground/85"
              : "min-w-0 py-2 text-sm leading-7 text-muted-foreground"
          }
        >
          {hasReview ? review.storedText : t("empty")}
        </p>

        <Button
          type="button"
          variant="ghost"
          aria-label={t(hasReview ? "edit" : "write")}
          title={t(hasReview ? "edit" : "write")}
          disabled={!review.editable}
          className="size-11 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden="true" className="size-3.5" />
        </Button>
      </section>
    );
  }

  return (
    <form
      className="min-w-0 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();

        const saved = await review.onSave();

        if (saved) setEditing(false);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t("label")}
      </label>

      <Textarea
        id={inputId}
        autoFocus
        rows={3}
        lang={review.language}
        spellCheck
        autoCapitalize="sentences"
        value={review.text}
        disabled={!review.editable}
        placeholder={t("placeholder")}
        aria-invalid={review.tooLong || review.saveError}
        aria-describedby={`${feedbackId} ${countId}`}
        className="max-h-48"
        onChange={(event) => {
          review.onChange(event.currentTarget.value);
        }}
      />

      <div id={feedbackId} aria-live="polite">
        {review.tooLong ? (
          <p className="text-xs leading-5 text-destructive">
            {t("errors.tooLong")}
          </p>
        ) : review.saveError ? (
          <p className="text-xs leading-5 text-destructive">
            {t(review.errorKey)}
          </p>
        ) : review.removing ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {t("removalHint")}
          </p>
        ) : null}
      </div>

      {review.remainingSeconds > 0 && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("retryAfter", { count: review.remainingSeconds })}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          id={countId}
          className={
            review.tooLong
              ? "text-[11px] tabular-nums text-destructive"
              : "text-[11px] tabular-nums text-muted-foreground"
          }
        >
          {review.characterCount} / {review.maxLength}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 px-3 text-xs"
            disabled={review.saving}
            onClick={() => {
              review.onDiscard();
              setEditing(false);
            }}
          >
            {t("cancel")}
          </Button>

          <LoadingButton
            type="submit"
            className="min-h-11 px-3 text-xs"
            loading={review.saving}
            loadingLabel={t("saving")}
            disabled={!review.canSave}
          >
            {t(review.removing ? "remove" : "save")}
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
