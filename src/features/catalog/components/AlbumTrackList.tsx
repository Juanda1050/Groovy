import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TrackPreferenceControls } from "@/features/library/components/TrackPreferenceControls";
import { useMusicPreferences } from "@/features/preferences/hooks/useMusicPreferences";
import type { AlbumTrackListProps } from "@/models/albumDetail";
import { Button } from "@/shared/components/ui/button";

export function AlbumTrackList({
  tracks,
  explicitLabel,
  openLabel,
  favoritesOnly = false,
}: AlbumTrackListProps) {
  const { t } = useTranslation("library");

  const preferences = useMusicPreferences(
    "track",
    tracks.map((track) => track.id),
  );

  const visibleTracks = favoritesOnly
    ? tracks.filter(
        (track) => preferences.preferences?.[track.id]?.is_favorite === true,
      )
    : tracks;

  return (
    <div
      aria-busy={preferences.loading || preferences.saving}
      className="min-w-0 space-y-3"
    >
      {preferences.loading && (
        <p role="status" className="sr-only">
          {t("tracks.loading")}
        </p>
      )}

      {preferences.readError && (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-destructive">
            {t("tracks.preferenceError")}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={preferences.fetching}
            onClick={preferences.onRetry}
          >
            {t("actions.retry")}
          </Button>
        </div>
      )}

      <ul className="divide-y divide-border/40">
        {visibleTracks.map((track) => (
          <li
            key={`${track.discNumber}:${track.id}`}
            className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-3"
          >
            <span
              aria-hidden="true"
              className="pt-0.5 text-center text-xs tabular-nums text-muted-foreground sm:pt-0"
            >
              {track.discNumber > 1
                ? `${track.discNumber}.${track.trackNumber}`
                : track.trackNumber}
            </span>

            <div className="min-w-0">
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${openLabel}: ${track.name}`}
                className="inline-flex max-w-full items-start gap-1.5 rounded-sm text-sm font-medium leading-5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="line-clamp-2 sm:line-clamp-1">
                  {track.name}
                </span>
                <ExternalLink
                  aria-hidden="true"
                  className="mt-1 size-3 shrink-0 text-muted-foreground"
                />
              </a>

              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                {track.explicit && (
                  <span
                    aria-label={explicitLabel}
                    title={explicitLabel}
                    className="flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-muted text-[9px] font-bold text-muted-foreground"
                  >
                    <span aria-hidden="true">E</span>
                  </span>
                )}
                <p className="truncate text-xs leading-5 text-muted-foreground">
                  {track.artists.join(", ")}
                </p>
              </div>
            </div>

            <span className="hidden min-w-10 text-right text-xs tabular-nums text-muted-foreground sm:block">
              {track.durationLabel}
            </span>

            <div className="col-start-2 flex flex-wrap items-center justify-between gap-x-2 sm:col-start-auto sm:justify-end">
              <TrackPreferenceControls
                name={track.name}
                preference={preferences.preferences?.[track.id]}
                disabled={preferences.disabled}
                onChange={(action, active) =>
                  preferences.onChange(track.id, action, active)
                }
              />
              <span className="text-xs tabular-nums text-muted-foreground sm:hidden">
                {track.durationLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {favoritesOnly &&
        !preferences.loading &&
        !preferences.readError &&
        visibleTracks.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("tracks.emptyTitle")}
          </p>
        )}
    </div>
  );
}
