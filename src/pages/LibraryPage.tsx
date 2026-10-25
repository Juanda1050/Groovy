import { Link } from 'react-router-dom'
import { Library } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LibraryCard } from '@/components/LibraryCard'
import { LibraryFilters } from '@/components/LibraryFilters'
import { LoadingButton } from '@/components/LoadingButton'
import { RecordLoader } from '@/components/RecordLoader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useLibrary } from '@/hooks/useLibrary'
import type {
  LibraryCardLabels,
  LibraryFilterOption,
} from '@/models/libraryView'

export default function LibraryPage() {
  const { t, i18n } = useTranslation('library')
  const library = useLibrary()

  const options: readonly LibraryFilterOption[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'pending', label: t('filters.pending') },
    { value: 'listened', label: t('filters.listened') },
    { value: 'rated', label: t('filters.rated') },
    { value: 'unrated', label: t('filters.unrated') },
    { value: 'reviewed', label: t('filters.reviewed') },
  ]

  const labels: LibraryCardLabels = {
    pending: t('filters.pending'),
    listened: t('filters.listened'),
    unavailable: t('metadata.unavailable'),
    metadataPending: t('metadata.pending'),
    review: t('card.review'),
    rating: t('card.rating'),
  }

  const numberFormatter = new Intl.NumberFormat(
    i18n.resolvedLanguage ?? 'en',
    { maximumFractionDigits: 1 },
  )

  return (
    <section className="min-w-0 space-y-6 pb-6">
      <header
        className="
          flex flex-wrap items-center justify-between
          gap-4 border-b border-border/50 pb-5
        "
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('title')}
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {t('description')}
          </p>
        </div>

        {!library.needsSignIn && (
          <Link
            to="/"
            className="
              inline-flex min-h-10 items-center justify-center
              rounded-full border border-primary/25
              bg-primary/10 px-4 text-xs font-medium text-primary
              transition-colors hover:bg-primary/20
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring
            "
          >
            {t('actions.discover')}
          </Link>
        )}
      </header>

      <div className="space-y-3">
        <LibraryFilters
          value={library.filter}
          options={options}
          label={t('filters.label')}
          disabled={library.isFetching || library.needsSignIn}
          onChange={library.onFilterChange}
        />

        {library.isFetching && !library.isPending && (
          <div
            role="status"
            aria-label={t('loading')}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <RecordLoader size="sm" />
            <span>{t('loading')}</span>
          </div>
        )}
      </div>

      {library.needsSignIn ? (
        <p className="text-sm text-muted-foreground">
          {t('localPreview')}
        </p>
      ) : library.isPending ? (
        <div role="status" aria-label={t('loading')}>
          <div
            aria-hidden="true"
            className="
              grid min-w-0 grid-cols-2 gap-x-3 gap-y-5
              sm:grid-cols-3 sm:gap-5
              lg:grid-cols-4 xl:grid-cols-5
            "
          >
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="min-w-0 space-y-2.5">
                <Skeleton className="aspect-square w-full rounded-xl sm:rounded-2xl" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : library.isError ? (
        <Alert className="max-w-lg">
          <AlertDescription>{t('error')}</AlertDescription>

          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            loading={library.isFetching}
            loadingLabel={t('loading')}
            onClick={library.onRetry}
            className="mt-3"
          >
            {t('actions.retry')}
          </LoadingButton>
        </Alert>
      ) : library.items.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <div
            className="
              flex size-14 items-center justify-center
              rounded-2xl border border-border/50
              bg-primary/10 text-primary
            "
          >
            <Library aria-hidden="true" className="size-7" />
          </div>

          <h2 className="mt-4 text-base font-medium">
            {t('empty.title')}
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {t('empty.description')}
          </p>
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
                item.rating === null
                  ? null
                  : numberFormatter.format(item.rating)
              }
            />
          ))}
        </div>
      )}

      {!library.needsSignIn &&
        !library.isError &&
        (library.items.length > 0 || library.hasPrevious) && (
          <div
            className="
              flex flex-wrap items-center justify-between
              gap-3 border-t border-border/50 pt-4
            "
          >
            <span className="text-xs text-muted-foreground">
              {t('pagination.page', { count: library.pageNumber })}
            </span>

            <div className="flex items-center gap-2">
              <LoadingButton
                type="button"
                variant="ghost"
                size="sm"
                loading={library.loadingPrevious}
                loadingLabel={t('loading')}
                disabled={!library.hasPrevious || library.isFetching}
                onClick={library.onPrevious}
              >
                {t('pagination.previous')}
              </LoadingButton>

              <LoadingButton
                type="button"
                variant="outline"
                size="sm"
                loading={library.loadingNext}
                loadingLabel={t('loading')}
                disabled={!library.hasNext || library.isFetching}
                onClick={library.onNext}
              >
                {t('pagination.next')}
              </LoadingButton>
            </div>
          </div>
        )}
    </section>
  )
}