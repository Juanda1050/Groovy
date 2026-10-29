import { ArrowLeft, Check, Music2, Search, Star, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useOptionalMusicFavorites } from "@/features/preferences/hooks/useOptionalMusicFavorites";
import type { OptionalMusicFavoritesProps } from "@/models/musicOnboarding";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export function OptionalMusicFavorites(props: OptionalMusicFavoritesProps) {
  const { t } = useTranslation("common");
  const form = useOptionalMusicFavorites(props);

  const albumIds = new Set(form.albums.map((album) => album.id));
  const trackIds = new Set(form.selectedTracks.map((track) => track.id));
  const knownIds = new Set(form.knownAlbums.map((album) => album.id));

  const hasSelection =
    form.albums.length > 0 ||
    form.selectedTracks.length > 0 ||
    form.knownAlbums.length > 0;

  return (
    <div hidden={!props.active}>
      <header className="mx-auto max-w-lg space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("musicOnboarding.optional.title")}
        </h1>

        <p className="text-sm text-muted-foreground">
          {t("musicOnboarding.optional.description")}
        </p>
      </header>

      {hasSelection && (
        <section
          aria-label={t("musicOnboarding.selectedLabel")}
          className="mx-auto mt-6 max-w-3xl space-y-3"
        >
          {form.albums.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-medium text-muted-foreground">
                {t("musicOnboarding.optional.albums")}
              </h2>

              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {form.albums.map((album) => (
                  <Button
                    key={album.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={props.saving}
                    onClick={() => form.toggleAlbum(album)}
                    aria-label={t("musicOnboarding.optional.remove", {
                      name: album.name,
                    })}
                    className="max-w-full"
                  >
                    <Star
                      aria-hidden="true"
                      className="fill-current text-primary"
                    />
                    <span className="truncate">{album.name}</span>
                    <X aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {form.selectedTracks.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-medium text-muted-foreground">
                {t("musicOnboarding.optional.songs")}
              </h2>

              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {form.selectedTracks.map((track) => (
                  <Button
                    key={track.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={props.saving}
                    onClick={() => form.toggleTrack(track)}
                    aria-label={t("musicOnboarding.optional.remove", {
                      name: track.name,
                    })}
                    className="max-w-full"
                  >
                    <Star
                      aria-hidden="true"
                      className="fill-current text-primary"
                    />
                    <span className="truncate">{track.name}</span>
                    <X aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {form.knownAlbums.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-medium text-muted-foreground">
                {t("musicOnboarding.optional.knownAlbums")}
              </h2>

              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {form.knownAlbums.map((album) => (
                  <Button
                    key={album.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={props.saving}
                    onClick={() => form.toggleKnownAlbum(album)}
                    aria-label={t("musicOnboarding.optional.remove", {
                      name: album.name,
                    })}
                    className="max-w-full"
                  >
                    <Check aria-hidden="true" />
                    <span className="truncate">{album.name}</span>
                    <X aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mx-auto mt-7 max-w-3xl">
        {form.albumId ? (
          <div className="space-y-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={props.saving}
              onClick={form.onCloseAlbum}
            >
              <ArrowLeft aria-hidden="true" />
              {t("musicOnboarding.optional.backToResults")}
            </Button>

            {form.album && (
              <>
                <div className="flex items-start gap-4">
                  {form.album.coverUrl ? (
                    <img
                      src={form.album.coverUrl}
                      alt=""
                      width={160}
                      height={160}
                      className="size-24 rounded-lg object-cover sm:size-32"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex size-24 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-32">
                      <Music2 aria-hidden="true" className="size-8" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-2">
                    <h2 className="text-lg font-semibold">{form.album.name}</h2>

                    <p className="text-sm text-muted-foreground">
                      {form.album.artists
                        .map((artist) => artist.name)
                        .join(", ")}
                    </p>

                    <a
                      href={form.album.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t("musicOnboarding.optional.openSpotify")}
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={
                      albumIds.has(form.album.id) ? "default" : "outline"
                    }
                    size="sm"
                    aria-pressed={albumIds.has(form.album.id)}
                    disabled={
                      props.saving ||
                      (!albumIds.has(form.album.id) &&
                        form.albums.length >= 100)
                    }
                    onClick={() => {
                      if (form.album) {
                        form.toggleAlbum(form.album);
                      }
                    }}
                  >
                    <Star
                      aria-hidden="true"
                      className={
                        albumIds.has(form.album.id) ? "fill-current" : undefined
                      }
                    />
                    {t("musicOnboarding.optional.favoriteAlbum")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={knownIds.has(form.album.id)}
                    disabled={
                      props.saving ||
                      (!knownIds.has(form.album.id) &&
                        form.knownAlbums.length >= 100)
                    }
                    onClick={() => {
                      if (form.album) {
                        form.toggleKnownAlbum(form.album);
                      }
                    }}
                  >
                    {knownIds.has(form.album.id) && (
                      <Check aria-hidden="true" />
                    )}
                    {t("musicOnboarding.optional.knownAlbum")}
                  </Button>
                </div>

                <section aria-label={t("musicOnboarding.optional.songs")}>
                  <h3 className="mb-2 text-sm font-medium">
                    {t("musicOnboarding.optional.chooseSongs")}
                  </h3>

                  <ul className="divide-y divide-border/60">
                    {form.availableTracks.map((track) => (
                      <li
                        key={track.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{track.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {track.artists.join(", ")}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-pressed={trackIds.has(track.id)}
                          aria-label={t(
                            trackIds.has(track.id)
                              ? "musicOnboarding.optional.remove"
                              : "musicOnboarding.optional.favoriteSong",
                            { name: track.name },
                          )}
                          disabled={
                            props.saving ||
                            (!trackIds.has(track.id) &&
                              form.selectedTracks.length >= 100)
                          }
                          onClick={() => form.toggleTrack(track)}
                        >
                          <Star
                            aria-hidden="true"
                            className={
                              trackIds.has(track.id)
                                ? "fill-current text-primary"
                                : undefined
                            }
                          />
                        </Button>
                      </li>
                    ))}
                  </ul>

                  {form.hasMoreTracks && (
                    <LoadingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={form.loading}
                      loadingLabel={t("status.loading")}
                      disabled={props.saving || props.catalogBlocked}
                      onClick={form.onMoreTracks}
                      className="mt-4"
                    >
                      {t("musicOnboarding.optional.moreSongs")}
                    </LoadingButton>
                  )}
                </section>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="relative mx-auto max-w-md">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                type="search"
                value={form.search}
                maxLength={120}
                disabled={props.saving}
                onChange={(event) => form.onSearch(event.currentTarget.value)}
                aria-label={t("musicOnboarding.optional.search")}
                placeholder={t("musicOnboarding.optional.searchPlaceholder")}
                autoComplete="off"
                className="min-h-11! rounded-full py-2! pl-11! pr-4! text-sm!"
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {form.items.map((album) => (
                <Button
                  key={album.id}
                  type="button"
                  variant="ghost"
                  disabled={props.saving || form.loading}
                  onClick={() => form.onOpenAlbum(album.id)}
                  className="h-auto! min-w-0 justify-start gap-3 p-2! text-left"
                >
                  {album.coverUrl ? (
                    <img
                      src={album.coverUrl}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="size-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Music2 aria-hidden="true" />
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {album.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {album.artists.map((artist) => artist.name).join(", ")}
                    </span>
                  </span>

                  {albumIds.has(album.id) && (
                    <Star
                      aria-hidden="true"
                      className="shrink-0 fill-current text-primary"
                    />
                  )}
                </Button>
              ))}
            </div>

            {!form.loading &&
              !form.readError &&
              !props.catalogBlocked &&
              form.hasSearched &&
              form.items.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("musicOnboarding.optional.empty")}
                </p>
              )}

            {(form.offset > 0 || form.nextOffset !== null) && (
              <div className="mt-5 flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    props.saving ||
                    form.loading ||
                    props.catalogBlocked ||
                    form.offset === 0
                  }
                  onClick={() => form.onPage(form.previousOffset)}
                >
                  {t("musicOnboarding.optional.previous")}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    props.saving ||
                    form.loading ||
                    props.catalogBlocked ||
                    form.nextOffset === null
                  }
                  onClick={() => {
                    if (form.nextOffset !== null) {
                      form.onPage(form.nextOffset);
                    }
                  }}
                >
                  {t("musicOnboarding.optional.next")}
                </Button>
              </div>
            )}
          </>
        )}

        {form.loading && (
          <div role="status" className="flex justify-center gap-3 py-6">
            <RecordLoader size="sm" />
            <span className="sr-only">{t("status.loading")}</span>
          </div>
        )}

        {(form.readError || props.catalogBlocked) && (
          <Alert className="mt-5">
            <AlertDescription>
              {props.catalogBlocked
                ? t("musicOnboarding.errors.catalogRate", {
                    count: props.retrySeconds,
                  })
                : t("musicOnboarding.optional.loadError")}
            </AlertDescription>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={props.saving || form.loading || props.catalogBlocked}
              onClick={form.onRetry}
              className="mt-2"
            >
              {t("actions.retry")}
            </Button>
          </Alert>
        )}
      </div>

      <footer className="sticky bottom-3 z-30 mx-auto mt-8 flex w-full max-w-xl gap-3 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg shadow-foreground/5 backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          disabled={props.saving}
          onClick={props.onBack}
        >
          <ArrowLeft aria-hidden="true" />
          {t("musicOnboarding.optional.back")}
        </Button>

        <LoadingButton
          type="button"
          loading={props.saving}
          loadingLabel={t("musicOnboarding.saving")}
          disabled={!props.canSubmit}
          onClick={() => props.onFinish(form.favorites)}
          className="min-h-10 flex-1"
        >
          {t("musicOnboarding.optional.finish")}
          <Check aria-hidden="true" />
        </LoadingButton>
      </footer>
    </div>
  );
}
