import { Check, Clock3, MessageSquare, Music2, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useAlbumPrefetch } from "@/hooks/useAlbumPrefetch";
import type { LibraryCardProps } from "@/models/libraryView";

export function LibraryCard({ item, ratingLabel, labels }: LibraryCardProps) {
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
              size-full object-cover transition-transform duration-300
              motion-safe:group-hover:scale-[1.03]
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
            pointer-events-none absolute inset-x-0 bottom-0 h-1/2
            bg-linear-to-t from-black/75 to-transparent
          "
        />

        {ratingLabel !== null && (
          <span
            aria-label={`${labels.rating}: ${ratingLabel}`}
            className="
              absolute right-2 top-2 inline-flex min-h-8 items-center
              gap-1.5 rounded-lg border border-white/15 bg-black/60
              px-2 text-xs font-semibold text-white backdrop-blur-md
            "
          >
            <Star aria-hidden="true" className="size-3.5 text-sky-300" />
            {ratingLabel}
          </span>
        )}

        <div
          className="
            absolute inset-x-2 bottom-2 flex items-center
            justify-between gap-2
          "
        >
          <span
            className={`
              inline-flex min-h-8 items-center gap-1.5
              rounded-lg border px-2 text-xs font-medium
              backdrop-blur-md
              ${
                item.status === "pending"
                  ? "border-amber-300/30 bg-amber-950/85 text-amber-100"
                  : "border-sky-300/30 bg-sky-950/85 text-sky-100"
              }
            `}
          >
            {item.status === "pending" ? (
              <Clock3 aria-hidden="true" className="size-3.5" />
            ) : (
              <Check aria-hidden="true" className="size-3.5" />
            )}

            {item.status === "pending" ? labels.pending : labels.listened}
          </span>

          {item.hasReview && (
            <span
              aria-label={labels.review}
              title={labels.review}
              className="
                flex size-8 items-center justify-center rounded-lg
                border border-white/15 bg-black/55
                text-white backdrop-blur-md
              "
            >
              <MessageSquare aria-hidden="true" className="size-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 px-0.5 pb-1 pt-2.5">
        <h2 className="truncate text-sm font-semibold leading-5">
          <Link
            to={`/albums/${item.spotifyAlbumId}`}
            className="
              rounded-sm hover:text-primary
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring
              after:absolute after:inset-0 after:z-10
            "
          >
            {item.title ?? labels.unavailable}
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
