import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toStars } from "@/lib/ratingScale";
import type { AlbumRatingBadgeProps } from "@/models/albumDetail";

export function AlbumRatingBadge({ rating }: AlbumRatingBadgeProps) {
  const { t, i18n } = useTranslation("rating");

  if (rating === null) return null;

  const value = new Intl.NumberFormat(
    i18n.resolvedLanguage ?? i18n.language ?? "en",
    { maximumFractionDigits: 2 },
  ).format(toStars(rating));

  return (
    <span
      aria-label={t("currentRating", { value })}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border/40 bg-background/95 px-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md"
    >
      <Star aria-hidden="true" className="size-3.5 fill-rating text-rating" />

      <span>{value}</span>
      <span className="font-normal text-muted-foreground">/ 5</span>
    </span>
  );
}
