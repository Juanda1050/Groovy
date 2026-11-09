import { Music2, Star, Trash2 } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useAlbumPrefetch } from "@/features/catalog/hooks/useAlbumPrefetch";
import { AlbumRatingBadge } from "@/features/library/components/AlbumRatingBadge";
import { AlbumStatusBadge } from "@/features/library/components/AlbumStatusBadge";
import type { LibraryCardProps } from "@/models/libraryView";
import { Button } from "@/shared/components/ui/button";

export function LibraryCard({
  item,
  labels,
  onRemove,
  favorite,
  favoriteDisabled,
  onFavoriteChange,
}: LibraryCardProps) {
  const { t } = useTranslation(["library", "rating"]);
  const titleId = useId();
  const title = item.title ?? labels.unavailable;

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
      {item.status !== null && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("removal.open", { ns: "rating" })}
          aria-describedby={titleId}
          title={t("removal.open", { ns: "rating" })}
          onClick={() => onRemove(item)}
          className="absolute top-2 right-2 z-20 size-11 rounded-xl border-border/60 bg-background/95 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-destructive/30 hover:bg-background hover:text-destructive"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      )}

      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt=""
            width={320}
            height={320}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none"
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
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/50 to-transparent"
        />

        {item.status === "listened" && item.rating !== null && (
          <div className="pointer-events-none absolute top-2 left-2">
            <AlbumRatingBadge rating={item.rating} />
          </div>
        )}

        {item.status !== null && (
          <div className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-4.5rem)]">
            <AlbumStatusBadge
              status={item.status}
              label={
                item.status === "pending" ? labels.pending : labels.listened
              }
            />
          </div>
        )}

        <Button
          type="button"
          variant={favorite ? "default" : "outline"}
          size="icon"
          disabled={favoriteDisabled}
          aria-pressed={favorite}
          aria-label={t(favorite ? "favorites.remove" : "favorites.add", {
            name: title,
          })}
          title={t(favorite ? "favorites.remove" : "favorites.add", {
            name: title,
          })}
          onClick={() => onFavoriteChange(item.spotifyAlbumId, !favorite)}
          className={
            favorite
              ? "absolute right-2 bottom-2 z-20 size-11 rounded-full shadow-sm"
              : "absolute right-2 bottom-2 z-20 size-11 rounded-full border-border/60 bg-background/95 text-muted-foreground shadow-sm hover:text-primary"
          }
        >
          <Star
            aria-hidden="true"
            className={favorite ? "size-4 fill-current" : "size-4"}
          />
        </Button>
      </div>

      <div className="min-w-0 px-0.5 pt-2.5 pb-1">
        <h2 id={titleId} className="truncate text-sm font-semibold leading-5">
          <Link
            to={`/albums/${item.spotifyAlbumId}`}
            className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:inset-0 after:z-10"
          >
            {title}
          </Link>
        </h2>

        {item.artists.length > 0 && (
          <p
            title={item.artists.join(", ")}
            className="mt-0.5 truncate text-xs leading-5 text-muted-foreground"
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
