import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { LibraryArtistCard } from "@/features/library/components/LibraryArtistCard";
import { useLibraryArtists } from "@/features/library/hooks/useLibraryArtists";
import { useMusicPreferences } from "@/features/preferences/hooks/useMusicPreferences";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Button } from "@/shared/components/ui/button";

export function LibraryArtists() {
  const { t } = useTranslation(["library", "discover"]);
  const artists = useLibraryArtists();
  const preferences = useMusicPreferences(
    "artist",
    artists.items.map((artist) => artist.id),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const removedByKeyboard = useRef<string | null>(null);

  useEffect(() => {
    const id = removedByKeyboard.current;

    if (!id || artists.items.some((artist) => artist.id === id)) return;

    removedByKeyboard.current = null;

    if (document.activeElement === document.body) {
      rootRef.current
        ?.querySelector<HTMLElement>("[data-artist-favorite], a")
        ?.focus();
    }
  }, [artists.items]);

  const busy = artists.isFetching || preferences.saving;

  return (
    <div ref={rootRef} aria-busy={busy}>
      <div className="mb-5 flex justify-end">
        <Link
          to="/?catalog=artists"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("artists.add", { ns: "discover" })}
        </Link>
      </div>

      {artists.needsSignIn ? (
        <p className="text-sm text-muted-foreground">{t("localPreview")}</p>
      ) : artists.isPending ? (
        <div role="status" aria-live="polite">
          <PageSkeleton variant="artists" />
          <span className="sr-only">{t("loading")}</span>
        </div>
      ) : artists.isError ? (
        <div role="alert" className="space-y-3 py-6">
          <p className="text-sm text-destructive">{t("error")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={artists.onRetry}
          >
            {t("actions.retry")}
          </Button>
        </div>
      ) : (
        <>
          {artists.metadataError && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-2"
            >
              <p className="text-xs text-muted-foreground">
                {t("artists.metadataError")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={artists.onRetry}
              >
                {t("actions.retry")}
              </Button>
            </div>
          )}

          {preferences.readError && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-2"
            >
              <p className="text-xs text-destructive">
                {t("favorites.loadError")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={preferences.onRetry}
              >
                {t("actions.retry")}
              </Button>
            </div>
          )}

          {artists.items.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-base font-medium">
                {t("artists.emptyTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("artists.emptyDescription")}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 items-start justify-items-center gap-x-6 gap-y-7 px-3 py-4 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-9 lg:grid-cols-4 xl:grid-cols-5">
              {artists.items.map((artist) => (
                <li key={artist.id} className="w-full">
                  <LibraryArtistCard
                    artist={artist}
                    favorite={
                      preferences.preferences?.[artist.id]?.is_favorite ?? true
                    }
                    disabled={preferences.disabled || artists.isFetching}
                    onFavoriteChange={(id, active) => {
                      const focused = document.activeElement;

                      if (
                        !active &&
                        focused instanceof HTMLElement &&
                        focused.dataset.artistFavorite === id
                      ) {
                        removedByKeyboard.current = id;
                      }

                      preferences.onChange(id, "favorite", active);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}

          {artists.items.length > 0 && (
            <nav
              aria-label={t("pagination.label")}
              className="mt-4 flex items-center justify-center gap-1 border-t border-border/40 pt-3"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.previous")}
                disabled={!artists.hasPrevious || busy}
                onClick={artists.onPrevious}
                className="size-11 rounded-xl p-0 text-muted-foreground"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="min-w-16 text-center text-xs tabular-nums text-muted-foreground"
              >
                {t("pagination.position", {
                  page: artists.pageNumber,
                  total: artists.pageCount,
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.next")}
                disabled={!artists.hasNext || busy}
                onClick={artists.onNext}
                className="size-11 rounded-xl p-0 text-muted-foreground"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
