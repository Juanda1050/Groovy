import { useId } from "react";
import { MessageSquare, Music2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumRatingBadge } from "@/components/AlbumRatingBadge";
import { AlbumStatusBadge } from "@/components/AlbumStatusBadge";
import { Button } from "@/components/ui/button";
import { useAlbumPrefetch } from "@/hooks/useAlbumPrefetch";

import type { LibraryCardProps } from "@/models/libraryView";

export function LibraryCard({ item, labels, onRemove }: LibraryCardProps) {
  const { t } = useTranslation("rating");
  const titleId = useId();

  const { elementRef, onPointerEnter, onPointerLeave, onFocus, onTouchStart } =
    useAlbumPrefetch(item.spotifyAlbumId);

  return (
    <article
      ref={elementRef}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onTouchStart={onTouchStart}
      className="group relative min-w-0"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t("removal.open")}
        aria-describedby={titleId}
        title={t("removal.open")}
        onClick={() => onRemove(item)}
        className="
          absolute right-2 top-2 z-20 size-11
          rounded-xl border-border/60 bg-background/95
          text-muted-foreground shadow-sm backdrop-blur-sm
          hover:border-destructive/30 hover:bg-background
          hover:text-destructive
        "
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>

      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt=""
            width={320}
            height={320}
            loading="lazy"
            decoding="async"
            className="
              size-full object-cover transition-transform
              duration-300 motion-safe:group-hover:scale-[1.03]
              motion-reduce:transition-none
            "
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Music2
              aria-hidden="true"
              className="size-12 text-muted-foreground/50"
            />
          </div>
        )}

        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute inset-x-0 bottom-0
            h-1/3 bg-linear-to-t from-black/50 to-transparent
          "
        />

        {item.status === "listened" && item.rating !== null && (
          <div className="pointer-events-none absolute left-2 top-2">
            <AlbumRatingBadge rating={item.rating} />
          </div>
        )}

        <div
          className="
            pointer-events-none absolute inset-x-2 bottom-2
            flex items-center justify-between gap-2
          "
        >
          <AlbumStatusBadge
            status={item.status}
            label={item.status === "pending" ? labels.pending : labels.listened}
          />

          {item.hasReview && (
            <span
              aria-label={labels.review}
              title={labels.review}
              className="
                flex size-8 shrink-0 items-center justify-center
                rounded-lg border border-white/15 bg-black/55
                text-white backdrop-blur-md
              "
            >
              <MessageSquare aria-hidden="true" className="size-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 px-0.5 pb-1 pt-2.5">
        <h2 id={titleId} className="truncate text-sm font-semibold leading-5">
          <Link
            to={`/albums/${item.spotifyAlbumId}`}
            className="
              rounded-sm hover:text-primary
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-ring
              after:absolute after:inset-0 after:z-10
            "
          >
            {item.title ?? labels.unavailable}
          </Link>
        </h2>

        {item.artists.length > 0 && (
          <p
            title={item.artists.join(", ")}
            className="
              mt-0.5 truncate text-xs leading-5
              text-muted-foreground
            "
          >
            {item.artists.join(", ")}
          </p>
        )}

        {!item.metadataAvailable && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {labels.metadataPending}
          </p>
        )}
      </div>
    </article>
  );
}
