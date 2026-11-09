import { ChevronLeft, ChevronRight, Library, Mic2, Music2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumConfirmation } from "@/features/library/components/AlbumConfirmation";
import { LibraryArtists } from "@/features/library/components/LibraryArtists";
import { LibraryCard } from "@/features/library/components/LibraryCard";
import { LibraryFilters } from "@/features/library/components/LibraryFilters";
import { LibrarySongs } from "@/features/library/components/LibrarySongs";
import { useAlbumRemoval } from "@/features/library/hooks/useAlbumStatus";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { useLibraryView } from "@/features/library/hooks/useLibraryView";
import type {
  LibraryCardLabels,
  LibraryFilterOption,
  LibraryItem,
  LibrarySection,
} from "@/models/libraryView";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Button } from "@/shared/components/ui/button";

export default function LibraryPage() {
  const { t, i18n } = useTranslation("library");
  const view = useLibraryView();
  const showingArtists = view.section === "artists";
  const showingAlbums = view.section === "albums";
  const showingSongs = !showingArtists && !showingAlbums;
  const library = useLibrary(showingAlbums);

  const [albumToRemove, setAlbumToRemove] = useState<LibraryItem | null>(null);
  const removal = useAlbumRemoval(albumToRemove?.spotifyAlbumId ?? "");

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

  function changeSection(section: LibrarySection): void {
    if (section !== view.section) view.onChange({ section });
  }

  function requestRemoval(item: LibraryItem): void {
    if (removal.saving || item.status === null) return;
    removal.onReset();
    setAlbumToRemove(item);
  }

  async function confirmRemoval(): Promise<void> {
    if (await removal.onRemove()) {
      setAlbumToRemove(null);
      removal.onReset();
    }
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
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/5 px-4 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("actions.discover")}
        </Link>
      </header>

      <div
        role="group"
        aria-label={t("sections.label")}
        className="grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 sm:inline-flex"
      >
        {(["artists", "albums", "tracks"] as const).map((value) => {
          const Icon =
            value === "artists" ? Mic2 : value === "albums" ? Library : Music2;
          const selected =
            value === "artists"
              ? showingArtists
              : value === "albums"
                ? showingAlbums
                : showingSongs;

          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              aria-pressed={selected}
              onClick={() =>
                changeSection(value === "tracks" ? view.trackSection : value)
              }
              className="min-h-12 min-w-0 gap-1.5 rounded-lg px-2 text-xs aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-sm sm:min-h-11 sm:min-w-28 sm:px-3 sm:text-sm"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{t(`sections.${value}`)}</span>
            </Button>
          );
        })}
      </div>

      {showingArtists ? (
        <LibraryArtists />
      ) : showingSongs ? (
        <LibrarySongs />
      ) : (
        <>
          <LibraryFilters
            value={library.filter}
            options={options}
            label={t("filters.label")}
            disabled={library.isFetching || library.needsSignIn}
            onChange={library.onFilterChange}
          />

          {library.preferenceError && (
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
          ) : library.isPending ? (
            <div role="status" aria-live="polite">
              <PageSkeleton variant="albums" />
              <span className="sr-only">{t("loading")}</span>
            </div>
          ) : library.isError ? (
            <div role="alert" className="space-y-3 py-6">
              <p className="text-sm text-destructive">{t("error")}</p>
              <Button type="button" variant="outline" onClick={library.onRetry}>
                {t("actions.retry")}
              </Button>
            </div>
          ) : library.items.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-base font-medium">
                {t(
                  library.filter === "favorites"
                    ? "favorites.emptyTitle"
                    : "empty.title",
                )}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  library.filter === "favorites"
                    ? "favorites.emptyDescription"
                    : "empty.description",
                )}
              </p>
            </div>
          ) : (
            <div
              aria-busy={library.isFetching}
              className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5"
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
                  onRemove={requestRemoval}
                />
              ))}
            </div>
          )}

          {!library.needsSignIn && !library.isPending && !library.isError && (
            <nav
              aria-label={t("pagination.label")}
              className="flex items-center justify-center gap-2 border-t border-border/40 pt-3"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.previous")}
                disabled={!library.hasPrevious || library.isFetching}
                onClick={library.onPrevious}
                className="size-11"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span
                role="status"
                aria-live="polite"
                className="min-w-16 text-center text-xs tabular-nums text-muted-foreground"
              >
                {t("pagination.position", {
                  page: library.pageNumber,
                  total: library.pageCount,
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.next")}
                disabled={!library.hasNext || library.isFetching}
                onClick={library.onNext}
                className="size-11"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
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
        onOpenChange={(open) => {
          if (!open && !removal.saving) {
            setAlbumToRemove(null);
            removal.onReset();
          }
        }}
        onConfirm={() => {
          void confirmRemoval();
        }}
      />
    </section>
  );
}
