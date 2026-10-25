import {
ChevronLeft,
ChevronRight,
Heart,
Library,
Music2,
ThumbsDown,
} from "lucide-react";
import { useId,useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumConfirmation } from "@/features/library/components/AlbumConfirmation";
import { LibraryCard } from "@/features/library/components/LibraryCard";
import { LibraryFilters } from "@/features/library/components/LibraryFilters";
import { useAlbumRemoval } from "@/features/library/hooks/useAlbumStatus";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { useLibraryTracks } from "@/features/library/hooks/useLibraryTracks";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

import type { LibraryCardLabels,LibraryFilterOption,LibraryItem,LibrarySection } from "@/models/libraryView";
import type { LibraryTrackView } from "@/models/trackPicks";

function TrackRow({
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
    <li
      className="
        group grid min-w-0
        grid-cols-[3.5rem_minmax(0,1fr)_auto]
        items-center gap-3 py-3
        sm:grid-cols-[4rem_minmax(0,1fr)_auto]
        sm:gap-4 sm:py-4
      "
    >
      <Link
        to={`/albums/${item.albumId}`}
        aria-label={t("tracks.openAlbum")}
        className="
          relative flex size-14 shrink-0 items-center
          justify-center overflow-hidden rounded-xl
          bg-muted ring-1 ring-border/50 transition-shadow
          hover:ring-primary/40
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-ring sm:size-16
        "
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

      <div className="min-w-0 space-y-1">
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
              className="
                block truncate rounded-sm text-sm
                font-semibold leading-5 transition-colors
                hover:text-primary
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring
              "
            >
              {track?.name ?? t("tracks.unavailable")}
            </a>

            {track && (
              <p className="truncate text-xs leading-5 text-foreground/75">
                {track.artists.join(", ")}
              </p>
            )}

            <Link
              to={`/albums/${item.albumId}`}
              className="
                block truncate rounded-sm text-[11px]
                leading-5 text-muted-foreground transition-colors
                hover:text-primary
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring
              "
            >
              {metadata?.albumName ?? t("tracks.openAlbum")}
            </Link>
          </>
        )}
      </div>

      {track && (
        <span
          className="
            self-center pl-1 text-[11px] tabular-nums
            text-muted-foreground sm:text-xs
          "
        >
          {track.durationLabel}
        </span>
      )}
    </li>
  );
}

export default function LibraryPage() {
  const { t, i18n } = useTranslation("library");
  const pageSizeId = useId();

  const [section, setSection] = useState<LibrarySection>("albums");

  const [albumToRemove, setAlbumToRemove] = useState<LibraryItem | null>(null);

  const removal = useAlbumRemoval(albumToRemove?.spotifyAlbumId ?? "");

  const showingTracks = section !== "albums";
  const library = useLibrary(!showingTracks);
  const tracks = useLibraryTracks(
    section === "dislikes" ? "least_favorite" : "favorite",
    showingTracks,
  );

  const current = showingTracks ? tracks : library;

  const options: readonly LibraryFilterOption[] = [
    { value: "all", label: t("filters.all") },
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

  function onRequestRemove(item: LibraryItem) {
    if (removal.saving) return;

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
      <header
        className="
          flex items-start justify-between gap-4
          border-b border-border/50 pb-5
        "
      >
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
          className="
            inline-flex min-h-11 shrink-0 items-center
            justify-center rounded-xl border border-primary/30
            bg-primary/5 px-4 text-xs font-medium text-primary
            transition-colors hover:border-primary/50
            hover:bg-primary/10
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2
            focus-visible:ring-offset-background
          "
        >
          {t("actions.discover")}
        </Link>
      </header>

      <div
        role="group"
        aria-label={t("sections.label")}
        className="flex flex-wrap items-center gap-1"
      >
        {(["albums", "likes", "dislikes"] as const).map((value) => {
          const Icon =
            value === "albums"
              ? Library
              : value === "likes"
                ? Heart
                : ThumbsDown;

          const colors =
            value === "likes"
              ? "aria-pressed:bg-like/10 aria-pressed:text-like"
              : value === "dislikes"
                ? "aria-pressed:bg-dislike/10 aria-pressed:text-dislike"
                : "aria-pressed:bg-primary/10 aria-pressed:text-primary";

          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              aria-pressed={section === value}
              onClick={() => {
                if (value === section) return;

                library.onFirst();
                tracks.onFirst();
                setSection(value);
              }}
              className={`
                  min-h-11 gap-2 rounded-xl px-3
                  text-xs sm:text-sm ${colors}
                `}
            >
              <Icon
                aria-hidden="true"
                className={`
                    size-4
                    ${value === "likes" ? "text-like" : ""}
                    ${value === "dislikes" ? "text-dislike" : ""}
                  `}
              />

              {t(`sections.${value}`)}
            </Button>
          );
        })}
      </div>

      {!showingTracks && (
        <LibraryFilters
          value={library.filter}
          options={options}
          label={t("filters.label")}
          disabled={library.isFetching || library.needsSignIn}
          onChange={library.onFilterChange}
        />
      )}

      {library.needsSignIn ? (
        <p className="text-sm text-muted-foreground">{t("localPreview")}</p>
      ) : current.isPending ? (
        <div
          role="status"
          className="
            flex items-center justify-center gap-3
            py-12 text-sm text-muted-foreground
          "
        >
          <RecordLoader size="sm" />
          {t("loading")}
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
            {t(showingTracks ? "tracks.emptyTitle" : "empty.title")}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {t(showingTracks ? "tracks.emptyDescription" : "empty.description")}
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
          className="
            grid min-w-0 grid-cols-2 gap-x-3 gap-y-5
            sm:grid-cols-3 sm:gap-5
            lg:grid-cols-4 xl:grid-cols-5
          "
        >
          {library.items.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              labels={labels}
              ratingLabel={
                item.rating === null ? null : formatter.format(item.rating)
              }
              onRemove={onRequestRemove}
            />
          ))}
        </div>
      )}

      {!library.needsSignIn && !current.isPending && !current.isError && (
        <nav
          aria-label={t("pagination.label")}
          className={`
              flex flex-wrap items-center justify-center
              gap-x-4 gap-y-2 pt-3
              ${showingTracks ? "" : "border-t border-border/40"}
            `}
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("pagination.previous")}
              disabled={!current.hasPrevious || current.isFetching}
              onClick={current.onPrevious}
              className="
                  size-11 rounded-xl p-0
                  text-muted-foreground
                "
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>

            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="
                  min-w-16 text-center text-xs
                  tabular-nums text-muted-foreground
                "
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
              className="
                  size-11 rounded-xl p-0
                  text-muted-foreground
                "
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span id={pageSizeId} className="text-xs text-muted-foreground">
              {t("pagination.perPage")}
            </span>

            <Select
              value={String(current.pageSize)}
              onValueChange={(value) => {
                if (value === "10" || value === "20" || value === "50") {
                  current.onPageSizeChange(Number(value));
                }
              }}
            >
              <SelectTrigger
                aria-labelledby={pageSizeId}
                disabled={current.isFetching}
                className="
                    min-h-11 w-18 rounded-xl
                    border-border/60 px-2.5 text-xs
                  "
              >
                <SelectValue>{current.pageSize}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </nav>
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
