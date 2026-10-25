import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ExternalLink, Heart, LoaderCircle, ThumbsDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAlbumTrackPicks } from "@/hooks/useAlbumTrackPicks";

import type { AlbumTrackListProps } from "@/models/albumDetail";

export function AlbumTrackList({
  tracks,
  explicitLabel,
  openLabel,
  albumId: providedAlbumId,
  favoritesOnly = false,
}: AlbumTrackListProps) {
  const params = useParams<"albumId">();
  const albumId = providedAlbumId ?? params.albumId ?? "";
  const { t } = useTranslation("trackPicks");
  const picks = useAlbumTrackPicks(albumId);

  const visibleTracks = favoritesOnly
    ? tracks.filter((track) => picks.preferences.get(track.id) === "favorite")
    : tracks;

  return (
    <div className="min-w-0 space-y-3">
      {picks.readError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2"
        >
          <p className="text-xs text-destructive">{t("readError")}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={picks.onRetry}
          >
            {t("retry")}
          </Button>
        </div>
      )}

      <ul className="divide-y divide-border/40">
        {visibleTracks.map((track) => {
          const preference = picks.preferences.get(track.id);
          const saving = picks.savingTrackId === track.id;

          return (
            <li
              key={`${track.discNumber}:${track.id}`}
              className="grid min-h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 py-1 sm:gap-3"
            >
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("trackAction", {
                  action: openLabel,
                  track: track.name,
                })}
                className="grid min-h-16 min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 rounded-xl px-1 py-3 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-3"
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
                        className="flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-muted text-[9px] font-bold text-muted-foreground"
                      >
                        <span aria-hidden="true">E</span>
                      </span>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {track.artists.join(", ")}
                    </p>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:hidden"
                    >
                      · {track.durationLabel}
                    </span>
                  </div>
                </div>

                <div className="hidden items-center gap-3 text-muted-foreground sm:flex">
                  <span className="text-xs tabular-nums">
                    {track.durationLabel}
                  </span>
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </div>
              </a>

              {picks.listened && (
                <div
                  role="group"
                  aria-label={track.name}
                  aria-busy={saving}
                  className="flex shrink-0 items-center"
                >
                  {(["favorite", "least_favorite"] as const).map((value) => {
                    const selected = preference === value;
                    const favorite = value === "favorite";
                    const Icon = favorite ? Heart : ThumbsDown;
                    const label = t(
                      favorite
                        ? selected
                          ? "removeFavorite"
                          : "favorite"
                        : selected
                          ? "removeLeastFavorite"
                          : "leastFavorite",
                    );

                    return (
                      <Button
                        key={value}
                        type="button"
                        variant="ghost"
                        disabled={picks.disabled}
                        aria-label={t("trackAction", {
                          action: label,
                          track: track.name,
                        })}
                        title={label}
                        aria-pressed={selected}
                        onClick={() => picks.onSelect(track.id, value)}
                        className={`
                          size-11 shrink-0 rounded-xl p-0
                          text-muted-foreground disabled:opacity-60
                          ${
                            favorite
                              ? "hover:bg-like/10 hover:text-like aria-pressed:bg-like/10 aria-pressed:text-like"
                              : "hover:bg-dislike/10 hover:text-dislike aria-pressed:bg-dislike/10 aria-pressed:text-dislike"
                          }
                        `}
                      >
                        {saving && selected ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin motion-reduce:animate-none"
                          />
                        ) : (
                          <Icon
                            aria-hidden="true"
                            className={`size-4 ${selected ? "fill-current" : ""}`}
                          />
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {picks.saveError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive"
        >
          <p>{t(`errors.${picks.errorKey}`)}</p>
          {picks.remainingSeconds > 0 && (
            <p>{t("retryAfter", { count: picks.remainingSeconds })}</p>
          )}
        </div>
      )}
    </div>
  );
}
