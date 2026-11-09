import { Disc3 } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { SearchAlbumCard } from "@/features/catalog/components/SearchAlbumCard";
import { useAlbumSearch } from "@/features/catalog/hooks/useAlbumSearch";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { SearchInput } from "@/shared/components/SearchInput";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

export function AlbumDiscovery() {
  const { t } = useTranslation("discover");
  const { onLoadMoreElement, ...search } = useAlbumSearch();
  const inputId = useId();

  const cardLabels = {
    save: t("actions.save"),
    saveListened: t("actions.saveListened"),
    saving: t("actions.saving"),
    savedPending: t("saved.pending"),
    savedListened: t("saved.listened"),
  };

  return (
    <div className="space-y-6">
      <SearchInput
        id={inputId}
        value={search.query}
        label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        clearLabel={t("actions.clear")}
        disabled={search.needsSignIn}
        onValueChange={search.onQueryChange}
      />

      {search.errorCode && (
        <Alert variant="destructive">
          <AlertDescription>{t(`errors.${search.errorCode}`)}</AlertDescription>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11"
            onClick={search.onRetry}
          >
            {t("actions.retry", { ns: "common" })}
          </Button>
        </Alert>
      )}

      {search.needsSignIn ? (
        <p className="text-sm text-muted-foreground">{t("signInRequired")}</p>
      ) : !search.canSearch ? (
        <div className="flex flex-col items-center border-t border-border/40 px-4 py-14 text-center">
          <Disc3 aria-hidden="true" className="size-10 text-primary/60" />
          <h2 className="mt-4 text-base font-medium">{t("initial.title")}</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {t("initial.description")}
          </p>
        </div>
      ) : (
        <section
          aria-labelledby={`${inputId}-results`}
          aria-busy={search.loading || search.loadingMore}
          className="space-y-5"
        >
          <h2
            id={`${inputId}-results`}
            className="flex min-h-9 items-center border-b border-border/40 pb-3 text-sm font-semibold"
          >
            {t("results")}
          </h2>

          {search.loading ? (
            <div role="status" aria-live="polite">
              <PageSkeleton variant="albums" />
              <span className="sr-only">{t("loading")}</span>
            </div>
          ) : search.items.length > 0 ? (
            <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5">
              {search.items.map((album) => (
                <SearchAlbumCard
                  key={album.id}
                  album={album}
                  labels={cardLabels}
                  disabled={search.saving}
                  pendingStatus={
                    search.savingAlbumId === album.id
                      ? search.savingStatus
                      : null
                  }
                  onSave={search.onSave}
                />
              ))}
            </div>
          ) : !search.errorCode ? (
            <p
              role="status"
              className="py-12 text-center text-sm text-muted-foreground"
            >
              {t("empty")}
            </p>
          ) : null}

          {search.nextErrorCode && (
            <Alert variant="destructive">
              <AlertDescription>
                {t(`errors.${search.nextErrorCode}`)}
              </AlertDescription>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11"
                onClick={search.onRetry}
              >
                {t("actions.retry", { ns: "common" })}
              </Button>
            </Alert>
          )}

          {(search.hasMore || search.loadingMore) && (
            <div
              ref={onLoadMoreElement}
              className="flex min-h-20 items-center justify-center"
            >
              {search.loadingMore && (
                <div role="status" className="flex items-center gap-2">
                  <RecordLoader size="sm" />
                  <span className="sr-only">{t("loading")}</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
