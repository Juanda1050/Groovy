import { useId, useState } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RecordLoader } from "@/components/RecordLoader";
import { Button } from "@/components/ui/button";
import { useAlbumRating } from "@/hooks/useAlbumRating";
import { getStarSelection, toStars, toStoredRating } from "@/lib/ratingScale";
import type { AlbumRatingProps } from "@/models/albumRating";

const stars = [1, 2, 3, 4, 5] as const;

export function AlbumRating({ albumId }: AlbumRatingProps) {
  const { t, i18n } = useTranslation("rating");
  const rating = useAlbumRating(albumId);
  const hintId = useId();
  const [preview, setPreview] = useState<number | null>(null);

  if (rating.loading) {
    return (
      <div
        role="status"
        aria-label={t("loading")}
        className="flex min-h-11 items-center px-2"
      >
        <RecordLoader size="sm" />
      </div>
    );
  }

  if (rating.readError) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 px-2 text-xs text-muted-foreground"
        disabled={rating.reading}
        onClick={rating.onRetry}
      >
        {t("retryRating")}
      </Button>
    );
  }

  if (!rating.listened) return null;

  const current = toStars(rating.value);
  const displayed = rating.disabled ? current : (preview ?? current);

  const formattedValue = new Intl.NumberFormat(
    i18n.resolvedLanguage ?? i18n.language ?? "en",
    { maximumFractionDigits: 2 },
  ).format(current);

  return (
    <div className="min-w-0">
      <p id={hintId} className="sr-only">
        {t("instructions")}
      </p>

      <div
        role="group"
        aria-label={
          rating.value === null
            ? t("unrated")
            : t("currentRating", { value: formattedValue })
        }
        aria-describedby={hintId}
        aria-busy={rating.saving}
        className="flex min-h-11 items-center"
        onPointerLeave={() => setPreview(null)}
      >
        {stars.map((value) => {
          const fill = Math.min(1, Math.max(0, displayed - value + 1));

          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              aria-label={t("starControl", { value })}
              aria-pressed={current > value - 1 && current <= value}
              disabled={rating.disabled}
              className="h-11 min-h-11 w-8 shrink-0 rounded-md p-0 hover:bg-rating/10 disabled:opacity-60"
              onPointerMove={(event) => {
                if (event.pointerType !== "mouse") return;

                const rect = event.currentTarget.getBoundingClientRect();

                setPreview(
                  getStarSelection(value, event.clientX, rect.left, rect.width),
                );
              }}
              onBlur={() => setPreview(null)}
              onKeyDown={(event) => {
                const direction =
                  event.key === "ArrowRight" || event.key === "ArrowUp"
                    ? 0.5
                    : event.key === "ArrowLeft" || event.key === "ArrowDown"
                      ? -0.5
                      : 0;

                if (!direction) return;

                event.preventDefault();
                setPreview(null);

                const next = Math.min(
                  5,
                  Math.max(1, Math.round((current || 1) * 2) / 2 + direction),
                );

                rating.onSelect(toStoredRating(next));
              }}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();

                const selected =
                  event.detail === 0
                    ? value
                    : getStarSelection(
                        value,
                        event.clientX,
                        rect.left,
                        rect.width,
                      );

                setPreview(null);
                rating.onSelect(toStoredRating(selected));
              }}
            >
              <span aria-hidden="true" className="relative block size-4.5">
                <Star className="absolute inset-0 size-4.5 text-muted-foreground/40" />

                <span
                  className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className="size-4.5 max-w-none fill-rating text-rating" />
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      {rating.saveError && (
        <p role="alert" className="max-w-xs text-xs leading-5 text-destructive">
          {t(rating.errorKey)}
        </p>
      )}

      {rating.remainingSeconds > 0 && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("retryAfter", { count: rating.remainingSeconds })}
        </p>
      )}

      <span role="status" className="sr-only">
        {rating.saving ? t("saving") : rating.saved ? t("saved") : ""}
      </span>
    </div>
  );
}
