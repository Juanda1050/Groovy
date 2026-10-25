import { ExternalLink } from "lucide-react";
import type { AlbumTrackListProps } from "@/models/albumDetail";

export function AlbumTrackList({
  tracks,
  explicitLabel,
  openLabel,
}: AlbumTrackListProps) {
  return (
    <ul className="divide-y divide-border/40">
      {tracks.map((track) => (
        <li key={`${track.discNumber}:${track.id}`}>
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${openLabel}: ${track.name}`}
            className="
              grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_auto]
              items-center gap-3 rounded-lg px-2 py-3
              transition-colors hover:bg-primary/5
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring sm:px-3
            "
          >
            <span
              aria-hidden="true"
              className="text-center text-xs tabular-nums text-muted-foreground"
            >
              {track.discNumber > 1
                ? `${track.discNumber}.${track.trackNumber}`
                : track.trackNumber}
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{track.name}</p>

              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                {track.explicit && (
                  <span
                    aria-label={explicitLabel}
                    title={explicitLabel}
                    className="
                      flex size-3.5 shrink-0 items-center
                      justify-center rounded-sm bg-muted
                      text-[9px] font-bold text-muted-foreground
                    "
                  >
                    E
                  </span>
                )}

                <p className="truncate text-xs text-muted-foreground">
                  {track.artists.join(", ")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="text-xs tabular-nums">
                {track.durationLabel}
              </span>

              <ExternalLink
                aria-hidden="true"
                className="hidden size-3.5 sm:block"
              />
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
