import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LibraryCard } from "@/components/LibraryCard";
import { LibraryFilters } from "@/components/LibraryFilters";
import { LoadingButton } from "@/components/LoadingButton";
import { PageIntro } from "@/components/PageIntro";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLibrary } from "@/hooks/useLibrary";
import type {
  LibraryCardLabels,
  LibraryFilterOption,
} from "@/models/libraryView";

export default function LibraryPage() {
  const { t, i18n } = useTranslation("library");
  const library = useLibrary();

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

  const numberFormatter = new Intl.NumberFormat(i18n.resolvedLanguage ?? "en", {
    maximumFractionDigits: 1,
  });

  return (
    <div className="space-y-7">
      <PageIntro title={t("title")} description={t("description")} />

      <LibraryFilters
        value={library.filter}
        options={options}
        label={t("filters.label")}
        disabled={library.isFetching || library.needsSignIn}
        onChange={library.onFilterChange}
      />

      {library.needsSignIn ? (
        <p className="text-sm text-muted-foreground">{t("localPreview")}</p>
      ) : library.isPending ? (
        <div role="status" aria-label={t("loading")}>
          <div
            aria-hidden="true"
            className="
              grid grid-cols-2 gap-4
              sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6
            "
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : library.isError ? (
        <Alert className="max-w-md">
          <AlertDescription>{t("error")}</AlertDescription>

          <LoadingButton
            type="button"
            variant="outline"
            loading={library.isFetching}
            loadingLabel={t("loading")}
            onClick={library.onRetry}
            className="mt-3"
          >
            {t("actions.retry")}
          </LoadingButton>
        </Alert>
      ) : library.items.length === 0 ? (
        <div className="max-w-md space-y-4 py-8">
          <h2 className="text-lg font-medium">{t("empty.title")}</h2>

          <p className="text-sm leading-6 text-muted-foreground">
            {t("empty.description")}
          </p>

          <Link
            to="/"
            className="
              inline-flex min-h-11 items-center rounded-xl
              bg-primary px-4 text-sm font-medium
              text-primary-foreground
            "
          >
            {t("actions.discover")}
          </Link>
        </div>
      ) : (
        <div
          className="
            grid grid-cols-2 gap-4
            sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6
          "
        >
          {library.items.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              labels={labels}
              ratingLabel={
                item.rating === null
                  ? null
                  : numberFormatter.format(item.rating)
              }
            />
          ))}
        </div>
      )}

      {!library.needsSignIn && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {t("pagination.page", { count: library.pageNumber })}
          </span>

          <div className="flex items-center gap-2">
            <LoadingButton
              type="button"
              variant="ghost"
              loading={library.loadingPrevious}
              loadingLabel={t("loading")}
              disabled={!library.hasPrevious || library.isFetching}
              onClick={library.onPrevious}
            >
              {t("pagination.previous")}
            </LoadingButton>

            <LoadingButton
              type="button"
              variant="outline"
              loading={library.loadingNext}
              loadingLabel={t("loading")}
              disabled={!library.hasNext || library.isFetching}
              onClick={library.onNext}
            >
              {t("pagination.next")}
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  );
}
