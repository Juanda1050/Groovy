import { Music2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { LibraryTrackView } from "@/models/trackPicks";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function TrackRow({
  item,
  loading,
}: {
  item: LibraryTrackView;
  loading: boolean;
}) {
  const { t } = useTranslation("library");

  const [failedCover, setFailedCover] = useState<string | null>(null);

  const metadata = item.metadata;
  const track = metadata?.track;
  const cover = metadata?.coverUrl ?? null;
  const waiting = loading && !metadata;

  return (
    <li className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-4 sm:py-4">
      <Link
        to={`/albums/${item.albumId}`}
        aria-label={t("tracks.openAlbum")}
        className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-border/50 transition-shadow hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-16"
      >
        {cover && failedCover !== cover ? (
          <img
            src={cover}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onError={() => setFailedCover(cover)}
          />
        ) : waiting ? (
          <Skeleton className="size-full rounded-none" />
        ) : (
          <Music2 aria-hidden="true" className="size-5 text-muted-foreground" />
        )}
      </Link>

      <div className="min-w-0 space-y-0.5 sm:space-y-1">
        {waiting ? (
          <>
            <Skeleton className="h-4 w-3/4 max-w-64" />
            <Skeleton className="h-3 w-1/2 max-w-40" />
            <Skeleton className="h-3 w-2/3 max-w-48" />
          </>
        ) : (
          <>
            <a
              href={`https://open.spotify.com/track/${item.trackId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 wrap-break-word rounded-sm text-sm font-semibold leading-5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:line-clamp-1"
            >
              {track?.name ?? t("tracks.unavailable")}
            </a>

            {track && (
              <p className="truncate text-xs leading-5 text-foreground/75">
                {track.artists.join(", ")}
              </p>
            )}

            <div className="flex min-w-0 items-center justify-between gap-2">
              <Link
                to={`/albums/${item.albumId}`}
                className="min-w-0 flex-1 truncate rounded-sm text-[11px] leading-5 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {metadata?.albumName ?? t("tracks.openAlbum")}
              </Link>

              {track && (
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:hidden">
                  {track.durationLabel}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {track && (
        <span className="hidden self-center pl-1 text-xs tabular-nums text-muted-foreground sm:block">
          {track.durationLabel}
        </span>
      )}
    </li>
  );
}
