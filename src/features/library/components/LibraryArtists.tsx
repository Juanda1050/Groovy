import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LibraryArtistCard } from "@/features/library/components/LibraryArtistCard";
import { useLibraryArtists } from "@/features/library/hooks/useLibraryArtists";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Button } from "@/shared/components/ui/button";

export function LibraryArtists() {
  const { t } = useTranslation("library");
  const artists = useLibraryArtists();

  if (artists.needsSignIn) {
    return <p className="text-sm text-muted-foreground">{t("localPreview")}</p>;
  }

  if (artists.isPending) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <PageSkeleton variant="artists" />
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  }

  if (artists.isError) {
    return (
      <div role="alert" className="space-y-3 py-6">
        <p className="text-sm text-destructive">{t("error")}</p>
        <Button
          type="button"
          variant="outline"
          disabled={artists.isFetching}
          onClick={artists.onRetry}
        >
          {t("actions.retry")}
        </Button>
      </div>
    );
  }

  if (artists.items.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-base font-medium">{t("artists.emptyTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("artists.emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div aria-busy={artists.isFetching}>
      {artists.metadataError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {t("artists.metadataError")}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={artists.isFetching}
            onClick={artists.onRetry}
          >
            {t("actions.retry")}
          </Button>
        </div>
      )}

      <ul className="grid grid-cols-2 items-start justify-items-center gap-x-6 gap-y-7 px-3 py-4 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-9 lg:grid-cols-4 xl:grid-cols-5">
        {artists.items.map((artist) => (
          <li key={artist.id} className="w-full">
            <LibraryArtistCard artist={artist} />
          </li>
        ))}
      </ul>

      <nav
        aria-label={t("pagination.label")}
        className="mt-4 flex items-center justify-center gap-1 border-t border-border/40 pt-3"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("pagination.previous")}
          disabled={!artists.hasPrevious || artists.isFetching}
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
          disabled={!artists.hasNext || artists.isFetching}
          onClick={artists.onNext}
          className="size-11 rounded-xl p-0 text-muted-foreground"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
