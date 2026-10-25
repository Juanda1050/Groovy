import { Check, Music2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingButton } from './LoadingButton'
import { RecordLoader } from './RecordLoader'
import type { SearchAlbumCardProps } from '@/models/catalog'

export function SearchAlbumCard({
  album,
  labels,
  disabled,
  pendingStatus,
  onSave,
}: SearchAlbumCardProps) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0">
      <div className="aspect-square bg-muted">
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt=""
            width={300}
            height={300}
            loading="lazy"
            decoding="async"
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Music2
              aria-hidden="true"
              className="size-10 text-muted-foreground/50"
            />
          </div>
        )}
      </div>

      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="min-w-0">
          <h2
            title={album.name}
            className="truncate text-sm font-semibold"
          >
            {album.name}
          </h2>

          <p className="mt-1 truncate text-xs text-muted-foreground">
            {album.artists.map((artist) => artist.name).join(', ')}
          </p>

          <a
            href={album.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-2 inline-flex min-h-9 items-center
              text-xs text-primary hover:underline
            "
          >
            Spotify ↗
          </a>
        </div>

        {album.libraryStatus ? (
          <p
            role="status"
            className="flex min-h-11 items-center gap-2 text-xs text-primary"
          >
            <Check aria-hidden="true" className="size-4 shrink-0" />

            {album.libraryStatus === 'pending'
              ? labels.savedPending
              : labels.savedListened}
          </p>
        ) : (
          <div className="flex items-center gap-1">
            <LoadingButton
              type="button"
              size="sm"
              loading={pendingStatus === 'pending'}
              loadingLabel={labels.saving}
              disabled={disabled}
              onClick={() => onSave(album.id, 'pending')}
              className="min-w-0 flex-1 px-2 text-xs"
            >
              {labels.save}
            </LoadingButton>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={labels.saveListened}
              title={labels.saveListened}
              aria-busy={pendingStatus === 'listened'}
              onClick={() => onSave(album.id, 'listened')}
            >
              {pendingStatus === 'listened'
                ? <RecordLoader />
                : <Check aria-hidden="true" className="size-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}