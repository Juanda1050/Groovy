import { useId } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageIntro } from '@/components/PageIntro'
import { SearchAlbumCard } from '@/components/SearchAlbumCard'
import { LoadingButton } from '@/components/LoadingButton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlbumSearch } from '@/hooks/useAlbumSearch'

export default function DiscoverPage() {
  const { t } = useTranslation('discover')
  const search = useAlbumSearch()
  const inputId = useId()

  const cardLabels = {
    save: t('actions.save'),
    saveListened: t('actions.saveListened'),
    saving: t('actions.saving'),
    savedPending: t('saved.pending'),
    savedListened: t('saved.listened'),
  }

  return (
    <div className="space-y-7">
      <PageIntro
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />

      <div className="max-w-xl space-y-2">
        <Label htmlFor={inputId} className="sr-only">
          {t('searchLabel')}
        </Label>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="
              pointer-events-none absolute left-4 top-1/2
              size-4 -translate-y-1/2 text-muted-foreground
            "
          />

          <Input
            id={inputId}
            type="search"
            value={search.query}
            maxLength={120}
            autoComplete="off"
            placeholder={t('searchPlaceholder')}
            disabled={search.needsSignIn}
            onChange={(event) => {
              search.onQueryChange(event.target.value)
            }}
            className="pl-11"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {search.needsSignIn
            ? t('signInRequired')
            : t('searchHint')}
        </p>
      </div>

      {search.errorCode && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertDescription>
            {t(`errors.${search.errorCode}`)}
          </AlertDescription>
        </Alert>
      )}

      {search.loading ? (
        <div role="status" aria-label={t('loading')}>
          <div
            aria-hidden="true"
            className="
              grid grid-cols-2 gap-4
              sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
            "
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : search.canSearch && !search.needsSignIn ? (
        search.items.length > 0 ? (
          <div
            className="
              grid grid-cols-2 gap-4
              sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
            "
          >
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
          <p className="py-8 text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : null
      ) : null}

      {search.canSearch && search.items.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {t('pagination.page', { count: search.pageNumber })}
          </span>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!search.hasPrevious || search.loading}
              onClick={search.onPrevious}
            >
              {t('pagination.previous')}
            </Button>

            <LoadingButton
              type="button"
              variant="outline"
              loading={search.loading}
              loadingLabel={t('loading')}
              disabled={!search.hasNext || search.loading}
              onClick={search.onNext}
            >
              {t('pagination.next')}
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  )
}