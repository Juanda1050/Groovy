import {
  ArrowLeft,
  Check,
  ExternalLink,
  Music2,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { OnboardingAlbumCard } from "@/features/preferences/components/OnboardingAlbumCard";
import { useOptionalMusicFavorites } from "@/features/preferences/hooks/useOptionalMusicFavorites";
import { uniqueAlbumChoices } from "@/features/preferences/lib/albumSelection";
import type { OptionalMusicFavoritesProps } from "@/models/musicOnboarding";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export function OptionalMusicFavorites(props: OptionalMusicFavoritesProps) {
  const { t } = useTranslation(["onboarding", "common"]);
  const form = useOptionalMusicFavorites(props);
  const [visibleSuggestions, setVisibleSuggestions] = useState(10);

  const albumIds = new Set(form.albums.map((album) => album.id));
  const trackIds = new Set(form.selectedTracks.map((track) => track.id));
  const knownIds = new Set(form.knownAlbums.map((album) => album.id));
  const retainedIds = new Set([...albumIds, ...knownIds]);
  const items = uniqueAlbumChoices(form.items, retainedIds);

  const hasSelection =
    form.albums.length > 0 ||
    form.selectedTracks.length > 0 ||
    form.knownAlbums.length > 0;

  const openAlbumId = form.albumId;
  const visibleItems = form.hasSearched
    ? items
    : items.slice(0, visibleSuggestions);
  const hasBufferedSuggestions =
    !form.hasSearched && items.length > visibleSuggestions;

  const initialLoading =
    form.loading && (form.albumId ? !form.album : visibleItems.length === 0);

  useEffect(() => {
    if (!props.active || !openAlbumId) return;

    const panel = document.getElementById("optionalAlbumPanel");
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ block: "start" });
  }, [props.active, openAlbumId]);

  function returnToResults(): void {
    const previousAlbumId = form.albumId;
    form.onCloseAlbum();

    window.requestAnimationFrame(() => {
      const previous = previousAlbumId
        ? document.getElementById(`onboardingAlbum${previousAlbumId}`)
        : null;

      (previous ?? document.getElementById("optionalMusicTitle"))?.focus();
    });
  }

  function showMoreSuggestions(): void {
    if (
      props.saving ||
      (!hasBufferedSuggestions && (form.loading || props.catalogBlocked))
    ) {
      return;
    }

    setVisibleSuggestions((current) => current + 10);

    if (
      !hasBufferedSuggestions &&
      form.hasMoreSuggestions &&
      !props.catalogBlocked
    ) {
      form.onMoreSuggestions();
    }
  }

  return (
    <div hidden={!props.active}>
      <header>
        <h1
          id="optionalMusicTitle"
          tabIndex={-1}
          className="scroll-mt-6 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          {t("musicOnboarding.optional.title")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("musicOnboarding.optional.description")}
        </p>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {!form.albumId && (
            <div className="relative w-full sm:max-w-sm">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="optionalMusicSearch"
                type="search"
                value={form.search}
                maxLength={120}
                disabled={props.saving}
                onChange={(event) => form.onSearch(event.currentTarget.value)}
                aria-label={t("musicOnboarding.optional.search")}
                placeholder={t("musicOnboarding.optional.searchPlaceholder")}
                autoComplete="off"
                className="h-11! min-h-11! rounded-lg py-2! pr-3! pl-9! text-base! sm:text-sm!"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:shrink-0">
            <Button
              type="button"
              variant="ghost"
              disabled={props.saving}
              onClick={props.onBack}
              className="min-h-11! rounded-lg"
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
              className="min-h-11! flex-1 rounded-lg sm:flex-none"
            >
              {t(
                hasSelection
                  ? "musicOnboarding.optional.finish"
                  : "musicOnboarding.optional.skip",
              )}
            </LoadingButton>
          </div>
        </div>
      </header>

      {form.albumId ? (
        <section
          id="optionalAlbumPanel"
          tabIndex={-1}
          aria-label={t("musicOnboarding.optional.albumSelection")}
          aria-busy={form.loading}
          className="mt-6 scroll-mt-5 space-y-6 outline-none"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={props.saving}
            onClick={returnToResults}
          >
            <ArrowLeft aria-hidden="true" />
            {t("musicOnboarding.optional.backToResults")}
          </Button>

          {initialLoading && (
            <div role="status" aria-live="polite">
              <PageSkeleton variant="albumDetail" />
              <span className="sr-only">
                {t("status.loading", { ns: "common" })}
              </span>
            </div>
          )}

          {form.album && (
            <>
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="relative size-28 shrink-0 sm:size-44">
                  {form.album.coverUrl ? (
                    <img
                      src={form.album.coverUrl}
                      alt=""
                      width={300}
                      height={300}
                      decoding="async"
                      className="size-full rounded-xl object-cover shadow-sm"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center rounded-xl bg-muted">
                      <Music2 aria-hidden="true" className="size-10" />
                    </span>
                  )}

                  {albumIds.has(form.album.id) && (
                    <span className="absolute right-2 bottom-2 rounded-lg bg-primary p-2 text-primary-foreground">
                      <Star
                        aria-hidden="true"
                        className="size-4 fill-current"
                      />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold tracking-tight sm:text-2xl">
                    {form.album.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {form.album.artists.map((artist) => artist.name).join(", ")}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={
                        albumIds.has(form.album.id) ? "default" : "outline"
                      }
                      aria-pressed={albumIds.has(form.album.id)}
                      disabled={
                        props.saving ||
                        (!albumIds.has(form.album.id) &&
                          form.albums.length >= 100)
                      }
                      onClick={() => {
                        if (form.album) form.toggleAlbum(form.album);
                      }}
                      className="min-h-11! max-w-full whitespace-normal"
                    >
                      <Star
                        aria-hidden="true"
                        className={
                          albumIds.has(form.album.id)
                            ? "fill-current"
                            : undefined
                        }
                      />
                      {t(
                        albumIds.has(form.album.id)
                          ? "musicOnboarding.optional.albumSelected"
                          : "musicOnboarding.optional.favoriteAlbum",
                      )}
                    </Button>

                    <a
                      href={form.album.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("musicOnboarding.optional.openSpotify")}
                      title={t("musicOnboarding.optional.openSpotify")}
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </a>
                  </div>
                </div>
              </div>

              <section aria-label={t("musicOnboarding.optional.songs")}>
                <h3 className="border-b border-border/40 pb-3 text-sm font-semibold">
                  {t("musicOnboarding.optional.chooseSongs")}
                </h3>

                <ul className="divide-y divide-border/40">
                  {form.availableTracks.map((track) => (
                    <li key={track.id}>
                      <Button
                        type="button"
                        variant="ghost"
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
                        className="h-auto! min-h-12! w-full justify-between gap-3 rounded-lg px-2! py-3! text-left aria-pressed:text-primary"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {track.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {track.artists.join(", ")}
                          </span>
                        </span>
                        <Star
                          aria-hidden="true"
                          className={
                            trackIds.has(track.id)
                              ? "fill-current text-primary"
                              : "text-muted-foreground"
                          }
                        />
                      </Button>
                    </li>
                  ))}
                </ul>

                {form.hasMoreTracks && (
                  <div className="flex justify-center pt-5">
                    <LoadingButton
                      type="button"
                      variant="outline"
                      loading={form.loading}
                      loadingLabel={t("musicOnboarding.optional.moreSongs")}
                      disabled={props.saving || props.catalogBlocked}
                      onClick={form.onMoreTracks}
                      className="min-h-11! rounded-lg"
                    >
                      {t("musicOnboarding.optional.moreSongs")}
                    </LoadingButton>
                  </div>
                )}
              </section>

              <details>
                <summary className="w-fit cursor-pointer rounded-sm py-2 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {t("musicOnboarding.optional.adjust")}
                </summary>
                <p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">
                  {t("musicOnboarding.optional.knownExplanation")}
                </p>
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
                    if (form.album) form.toggleKnownAlbum(form.album);
                  }}
                  className="mt-3"
                >
                  {knownIds.has(form.album.id) && <Check aria-hidden="true" />}
                  {t("musicOnboarding.optional.knownAlbum")}
                </Button>
              </details>
            </>
          )}
        </section>
      ) : (
        <section className="mt-6" aria-busy={form.loading}>
          <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {t(
                form.hasSearched
                  ? "musicOnboarding.optional.search"
                  : "musicOnboarding.optional.fromArtists",
              )}
            </h2>
            {form.hasSearched && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={props.saving}
                onClick={() => form.onSearch("")}
              >
                <ArrowLeft aria-hidden="true" />
                {t("musicOnboarding.optional.forYou")}
              </Button>
            )}
          </div>

          {initialLoading ? (
            <div role="status" aria-live="polite">
              <PageSkeleton variant="albums" />
              <span className="sr-only">
                {t("status.loading", { ns: "common" })}
              </span>
            </div>
          ) : (
            <ul className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5">
              {visibleItems.map((album) => (
                <li key={album.id} className="min-w-0">
                  <OnboardingAlbumCard
                    album={album}
                    selectedAlbum={
                      form.albums.find((item) => item.id === album.id) ?? null
                    }
                    disabled={props.saving}
                    atLimit={form.albums.length >= 100}
                    catalogBlocked={props.catalogBlocked}
                    onOpen={form.onOpenAlbum}
                    onToggle={form.toggleAlbum}
                    onCatalogError={props.onCatalogError}
                  />
                </li>
              ))}
            </ul>
          )}

          {!form.loading &&
            !form.readError &&
            !props.catalogBlocked &&
            items.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t(
                  form.hasSearched
                    ? "musicOnboarding.optional.empty"
                    : "musicOnboarding.optional.noSuggestions",
                )}
              </p>
            )}

          {!form.hasSearched &&
            !initialLoading &&
            (hasBufferedSuggestions || form.hasMoreSuggestions) && (
              <div className="flex justify-center pt-6">
                <LoadingButton
                  type="button"
                  variant="outline"
                  loading={form.loading && !hasBufferedSuggestions}
                  loadingLabel={t("musicOnboarding.optional.moreAlbums")}
                  disabled={
                    props.saving ||
                    (!hasBufferedSuggestions && props.catalogBlocked)
                  }
                  onClick={showMoreSuggestions}
                  className="min-h-11! max-w-full rounded-lg"
                >
                  <Plus aria-hidden="true" />
                  {t("musicOnboarding.optional.moreAlbums")}
                </LoadingButton>
              </div>
            )}

          {form.hasSearched &&
            (form.offset > 0 || form.nextOffset !== null) && (
              <div className="flex flex-wrap justify-center gap-2 pt-6">
                <Button
                  type="button"
                  variant="outline"
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
                  disabled={
                    props.saving ||
                    form.loading ||
                    props.catalogBlocked ||
                    form.nextOffset === null
                  }
                  onClick={() => {
                    if (form.nextOffset !== null) form.onPage(form.nextOffset);
                  }}
                >
                  {t("musicOnboarding.optional.next")}
                </Button>
              </div>
            )}
        </section>
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
            {t("actions.retry", { ns: "common" })}
          </Button>
        </Alert>
      )}

      {props.saveError && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>
            {t(`musicOnboarding.errors.${props.saveError}`)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
