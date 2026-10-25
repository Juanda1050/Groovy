import { Check, ExternalLink, Music2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { AlbumRatingBadge } from "@/components/AlbumRatingBadge";
import { AlbumStatusBadge } from "@/components/AlbumStatusBadge";
import { Button } from "@/components/ui/button";
import { RecordLoader } from "@/components/RecordLoader";
import { useAlbumReturn } from "@/hooks/useAlbumReturn";
import { useAlbumPrefetch } from "@/hooks/useAlbumPrefetch";
import type { SearchAlbumCardProps } from "@/models/catalog";

export function SearchAlbumCard({
  album,
  labels,
  disabled,
  pendingStatus,
  onSave,
}: SearchAlbumCardProps) {
  const { detailNavigationState } = useAlbumReturn();

  const { elementRef, onPointerEnter, onPointerLeave, onFocus, onTouchStart } =
    useAlbumPrefetch(album.id);

  return (
    <article
      ref={elementRef}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onTouchStart={onTouchStart}
      className="group min-w-0"
    >
      <div className="relative">
        <Link
          to={`/albums/${album.id}`}
          state={detailNavigationState}
          aria-label={album.name}
          className="relative block aspect-square overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-black/5 dark:ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt=""
              width={300}
              height={300}
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

          {album.libraryStatus && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/50 to-transparent"
            />
          )}
        </Link>

        {album.libraryStatus === "listened" && album.libraryRating != null && (
          <div className="pointer-events-none absolute left-2 top-2">
            <AlbumRatingBadge rating={album.libraryRating} />
          </div>
        )}

        <a
          href={album.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Spotify: ${album.name}`}
          title={`Spotify: ${album.name}`}
          className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>

        {album.libraryStatus ? (
          <div className="pointer-events-none absolute bottom-2 left-2">
            <AlbumStatusBadge
              status={album.libraryStatus}
              label={
                album.libraryStatus === "pending"
                  ? labels.savedPending
                  : labels.savedListened
              }
            />
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={`${labels.save}: ${album.name}`}
              title={labels.save}
              aria-busy={pendingStatus === "pending"}
              onClick={() => onSave(album.id, "pending")}
              className="size-10 rounded-full border-white/15 bg-black/65 text-white backdrop-blur-md hover:bg-primary hover:text-primary-foreground"
            >
              {pendingStatus === "pending" ? (
                <RecordLoader size="sm" />
              ) : (
                <Plus aria-hidden="true" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={`${labels.saveListened}: ${album.name}`}
              title={labels.saveListened}
              aria-busy={pendingStatus === "listened"}
              onClick={() => onSave(album.id, "listened")}
              className="size-10 rounded-full border-white/15 bg-black/65 text-white backdrop-blur-md hover:bg-primary hover:text-primary-foreground"
            >
              {pendingStatus === "listened" ? (
                <RecordLoader size="sm" />
              ) : (
                <Check aria-hidden="true" />
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="min-w-0 pt-3">
        <h3
          title={album.name}
          className="truncate text-sm font-semibold leading-5"
        >
          <Link
            to={`/albums/${album.id}`}
            state={detailNavigationState}
            className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {album.name}
          </Link>
        </h3>

        <p
          title={album.artists.map((artist) => artist.name).join(", ")}
          className="mt-1 truncate text-xs leading-5 text-muted-foreground"
        >
          {album.artists.map((artist) => artist.name).join(", ")}
        </p>
      </div>
    </article>
  );
}
