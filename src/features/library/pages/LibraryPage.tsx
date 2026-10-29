import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Library,
  Mic2,
  Music2,
  ThumbsDown,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumConfirmation } from "@/features/library/components/AlbumConfirmation";
import { LibraryArtists } from "@/features/library/components/LibraryArtists";
import { LibraryCard } from "@/features/library/components/LibraryCard";
import { LibraryFilters } from "@/features/library/components/LibraryFilters";
import { TrackRow } from "@/features/library/components/TrackRow";
import { useAlbumRemoval } from "@/features/library/hooks/useAlbumStatus";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { useLibraryTracks } from "@/features/library/hooks/useLibraryTracks";
import { useLibraryView } from "@/features/library/hooks/useLibraryView";
import type {
  LibraryCardLabels,
  LibraryFilterOption,
  LibraryItem,
  LibrarySection,
} from "@/models/libraryView";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";

export default function LibraryPage() {
  const { t, i18n } = useTranslation("library");
  const view = useLibraryView();
  const { section, trackSection } = view;

  const [albumToRemove, setAlbumToRemove] = useState<LibraryItem | null>(null);
  const removal = useAlbumRemoval(albumToRemove?.spotifyAlbumId ?? "");

  const showingArtists = section === "artists";
  const showingTracks = section === "likes" || section === "dislikes";
  const library = useLibrary(section === "albums");
  const tracks = useLibraryTracks(
    section === "dislikes" ? "least_favorite" : "favorite",
    showingTracks,
  );
  const current = showingTracks ? tracks : library;

  const options: readonly LibraryFilterOption[] = [
    { value: "all", label: t("filters.all") },
    { value: "favorites", label: t("filters.favorites") },
    { value: "pending", label: t("filters.pending") },
    { value: "listened", label: t("filters.listened") },
    { value: "rated", label: t("filters.rated") },
    { value: "unrated", label: t("filters.unrated") },
    { value: "reviewed", label: t("filters.reviewed") },
  ];

  const labels: LibraryCardLabels = {
    pending: t("filters.pending"),
    listened: t("filters.listened"),
    unavailable: t("metadata.unavailable"),
    metadataPending: t("metadata.pending"),
    review: t("card.review"),
    rating: t("card.rating"),
  };

  const formatter = new Intl.NumberFormat(i18n.resolvedLanguage ?? "en", {
    maximumFractionDigits: 1,
  });

  function onSectionChange(next: LibrarySection): void {
    if (next === section) return;

    view.onChange({
      section: next,
      ...(next === "likes" || next === "dislikes"
        ? { trackSection: next }
        : {}),
    });
  }

  function onRequestRemove(item: LibraryItem) {
    if (removal.saving || item.status === null) return;
    removal.onReset();
    setAlbumToRemove(item);
  }

  function onRemovalOpenChange(open: boolean) {
    if (open || removal.saving) return;
    setAlbumToRemove(null);
    removal.onReset();
  }

  async function onConfirmRemoval() {
    const removed = await removal.onRemove();
    if (!removed) return;
    setAlbumToRemove(null);
    removal.onReset();
  }

  return (
    <section className="min-w-0 space-y-5 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border/50 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/5 px-4 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t("actions.discover")}
        </Link>
      </header>

      <div
        role="group"
        aria-label={t("sections.label")}
        className="grid min-w-0 grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 sm:inline-flex"
      >
        {(["artists", "albums", "tracks"] as const).map((value) => {
          const Icon =
            value === "artists" ? Mic2 : value === "albums" ? Library : Music2;
          const selected =
            value === "artists"
              ? showingArtists
              : value === "albums"
                ? section === "albums"
                : showingTracks;

          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              aria-pressed={selected}
              onClick={() =>
                onSectionChange(value === "tracks" ? trackSection : value)
              }
              className="min-h-12 min-w-0 gap-1.5 rounded-lg px-2 text-xs font-medium aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-sm sm:min-h-11 sm:min-w-28 sm:px-3 sm:text-sm"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{t(`sections.${value}`)}</span>
            </Button>
          );
        })}
      </div>

      {showingArtists ? (
        <LibraryArtists />
      ) : (
        <>
          {showingTracks && (
            <div
              role="group"
              aria-label={t("sections.trackPreferences")}
              className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            >
              {(["likes", "dislikes"] as const).map((value) => {
                const Icon = value === "likes" ? Heart : ThumbsDown;
                const colors =
                  value === "likes"
                    ? "aria-pressed:border-like/30 aria-pressed:bg-like/10 aria-pressed:text-like"
                    : "aria-pressed:border-dislike/30 aria-pressed:bg-dislike/10 aria-pressed:text-dislike";

                return (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    aria-pressed={section === value}
                    onClick={() => onSectionChange(value)}
                    className={`min-h-11 min-w-0 gap-2 rounded-lg border border-border/60 px-3 text-xs font-medium sm:text-sm ${colors}`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`size-4 shrink-0 ${
                        value === "likes" ? "text-like" : "text-dislike"
                      }`}
                    />
                    <span className="truncate">{t(`sections.${value}`)}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {!showingTracks && (
            <LibraryFilters
              value={library.filter}
              options={options}
              label={t("filters.label")}
              disabled={library.isFetching || library.needsSignIn}
              onChange={library.onFilterChange}
            />
          )}

          {!showingTracks && library.preferenceError && (
            <div role="alert" className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-destructive">
                {t("favorites.loadError")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={library.onPreferenceRetry}
              >
                {t("actions.retry")}
              </Button>
            </div>
          )}

          {library.needsSignIn ? (
            <p className="text-sm text-muted-foreground">{t("localPreview")}</p>
          ) : current.isPending ? (
            <div role="status" aria-live="polite">
              {showingTracks ? (
                <div className="flex justify-center py-12">
                  <RecordLoader size="sm" />
                </div>
              ) : (
                <PageSkeleton variant="albums" />
              )}
              <span className="sr-only">{t("loading")}</span>
            </div>
          ) : current.isError ? (
            <div role="alert" className="space-y-3 py-6">
              <p className="text-sm text-destructive">{t("error")}</p>
              <Button type="button" variant="outline" onClick={current.onRetry}>
                {t("actions.retry")}
              </Button>
            </div>
          ) : current.items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <h2 className="text-base font-medium">
                {t(
                  showingTracks
                    ? "tracks.emptyTitle"
                    : library.filter === "favorites"
                      ? "favorites.emptyTitle"
                      : "empty.title",
                )}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  showingTracks
                    ? "tracks.emptyDescription"
                    : library.filter === "favorites"
                      ? "favorites.emptyDescription"
                      : "empty.description",
                )}
              </p>
            </div>
          ) : showingTracks ? (
            <div aria-busy={tracks.isFetching || tracks.metadataLoading}>
              {tracks.metadataError && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center gap-2 pb-3"
                >
                  <p className="text-xs text-destructive">
                    {t("tracks.metadataError")}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={tracks.onRetry}
                  >
                    {t("actions.retry")}
                  </Button>
                </div>
              )}
              <ul className="divide-y divide-border/40">
                {tracks.items.map((item) => (
                  <TrackRow
                    key={`${item.userAlbumId}:${item.trackId}`}
                    item={item}
                    loading={tracks.metadataLoading}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <div
              aria-busy={library.isFetching}
              className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5"
            >
              {library.items.map((item) => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  labels={labels}
                  ratingLabel={
                    item.rating === null ? null : formatter.format(item.rating)
                  }
                  favorite={
                    library.preferences?.[item.spotifyAlbumId]?.is_favorite ??
                    library.filter === "favorites"
                  }
                  favoriteDisabled={library.favoriteDisabled}
                  onFavoriteChange={library.onFavoriteChange}
                  onRemove={onRequestRemove}
                />
              ))}
            </div>
          )}

          {!library.needsSignIn && !current.isPending && !current.isError && (
            <nav
              aria-label={t("pagination.label")}
              className={`flex min-w-0 items-center justify-center gap-2 pt-3 ${
                showingTracks ? "" : "border-t border-border/40"
              }`}
            >
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("pagination.previous")}
                  disabled={!current.hasPrevious || current.isFetching}
                  onClick={current.onPrevious}
                  className="size-11 rounded-xl p-0 text-muted-foreground"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                <span
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="min-w-16 text-center text-xs tabular-nums text-muted-foreground"
                >
                  {t("pagination.position", {
                    page: current.pageNumber,
                    total: current.pageCount,
                  })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("pagination.next")}
                  disabled={!current.hasNext || current.isFetching}
                  onClick={current.onNext}
                  className="size-11 rounded-xl p-0 text-muted-foreground"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <AlbumConfirmation
        mode="delete"
        open={albumToRemove !== null}
        saving={removal.saving}
        disabled={removal.disabled}
        errorKey={removal.errorKey}
        remainingSeconds={removal.remainingSeconds}
        onOpenChange={onRemovalOpenChange}
        onConfirm={() => {
          void onConfirmRemoval();
        }}
      />
    </section>
  );
}
