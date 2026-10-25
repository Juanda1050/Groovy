import { Disc3,Search,X } from "lucide-react";
import { useId,useRef } from "react";
import { useTranslation } from "react-i18next";

import { SearchAlbumCard } from "@/features/catalog/components/SearchAlbumCard";
import { useAlbumSearch } from "@/features/catalog/hooks/useAlbumSearch";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Alert,AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function DiscoverPage() {
  const { t } = useTranslation("discover");
  const { onLoadMoreElement, ...search } = useAlbumSearch();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const cardLabels = {
    save: t("actions.save"),
    saveListened: t("actions.saveListened"),
    saving: t("actions.saving"),
    savedPending: t("saved.pending"),
    savedListened: t("saved.listened"),
  };

  return (
    <section className="min-w-0 space-y-8 pb-6 sm:space-y-10">
      <header className="space-y-6">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {t("eyebrow")}
          </p>

          <h1 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t("title")}
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="max-w-2xl">
          <Label htmlFor={inputId} className="sr-only">
            {t("searchLabel")}
          </Label>

          <div className="relative rounded-xl border border-border/60 bg-background/40 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              ref={inputRef}
              id={inputId}
              type="text"
              inputMode="search"
              value={search.query}
              maxLength={120}
              autoComplete="off"
              spellCheck={false}
              placeholder={t("searchPlaceholder")}
              disabled={search.needsSignIn}
              onChange={(event) => search.onQueryChange(event.target.value)}
              className="h-12 w-full rounded-xl border-0 bg-transparent pl-11 pr-12 text-base shadow-none focus-visible:ring-0 sm:text-sm"
            />

            {search.query.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("actions.clear")}
                onClick={() => {
                  search.onQueryChange("");
                  inputRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 size-10 -translate-y-1/2 rounded-lg"
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </header>

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

          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            {t("initial.description")}
          </p>
        </div>
      ) : (
        <section
          aria-labelledby={`${inputId}-results`}
          aria-busy={search.loading || search.loadingMore}
          className="space-y-5"
        >
          <div className="flex min-h-9 items-center justify-between gap-3 border-b border-border/40 pb-3">
            <h2 id={`${inputId}-results`} className="text-sm font-semibold">
              {t("results")}
            </h2>

            {search.loading && (
              <div role="status" className="flex items-center gap-2">
                <RecordLoader size="sm" />
                <span className="sr-only">{t("loading")}</span>
              </div>
            )}
          </div>

          {search.loading ? (
            <div
              aria-hidden="true"
              className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5"
            >
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="min-w-0 space-y-3">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
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
                <div
                  role="status"
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <RecordLoader size="sm" />
                  {t("loading")}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
