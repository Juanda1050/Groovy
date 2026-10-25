import { AlbumTrackList } from "@/features/catalog/components/AlbumTrackList";
import { useAlbumDetail } from "@/features/catalog/hooks/useAlbumDetail";
import { useAlbumMetadata } from "@/features/catalog/hooks/useAlbumMetadata";
import { useAlbumRecovery } from "@/features/catalog/hooks/useAlbumRecovery";
import { AlbumStatus } from "@/features/library/components/AlbumStatus";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";
import {
ArrowLeft,
CalendarDays,
Disc3,
ExternalLink,
ListMusic,
Music2,
Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link,useParams } from "react-router-dom";

export default function AlbumDetailPage() {
  const { albumId = "" } = useParams<"albumId">();
  const { t, i18n } = useTranslation("album");
  const detail = useAlbumDetail(albumId);
  const recovery = useAlbumRecovery(albumId);

  const metadata = useAlbumMetadata(
    detail.album,
    i18n.resolvedLanguage ?? i18n.language ?? "en",
  );

  const waiting = detail.waitingSeconds > 0;

  if (detail.loading) {
    return (
      <div
        role="status"
        className="flex min-h-[60svh] flex-col items-center justify-center gap-6 px-4 text-center"
      >
        <RecordLoader size="lg" />

        <p className="max-w-sm text-sm text-muted-foreground">
          {waiting
            ? t("waiting", { count: detail.waitingSeconds })
            : t("loading")}
        </p>
      </div>
    );
  }

  const album = detail.album;

  if (detail.invalidId || detail.error || !album) {
    return (
      <section
        aria-labelledby="albumErrorTitle"
        className="flex min-h-[60svh] flex-col items-center justify-center px-4 py-10 text-center"
      >
        <Disc3
          aria-hidden="true"
          className="size-12 text-muted-foreground/60"
        />

        <h1
          id="albumErrorTitle"
          className="mt-6 max-w-md text-2xl font-semibold tracking-tight"
        >
          {t("unavailableTitle")}
        </h1>

        <p
          role="status"
          className="mt-3 max-w-md text-sm leading-6 text-muted-foreground"
        >
          {detail.invalidId ? t("invalid") : t(detail.errorKey)}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={recovery.onRecover}>
            <Search aria-hidden="true" className="size-4" />
            {t(recovery.recoveryLabelKey)}
          </Button>

          {!detail.invalidId && (
            <LoadingButton
              type="button"
              variant="outline"
              disabled={waiting}
              loading={detail.retrying}
              loadingLabel={t("loading")}
              onClick={detail.onRetry}
            >
              {t("retry")}
            </LoadingButton>
          )}
        </div>

        {waiting && (
          <p className="mt-4 text-xs text-muted-foreground">
            {t("retryAvailable", { count: detail.waitingSeconds })}
          </p>
        )}

        <Link
          to={recovery.returnTo}
          replace
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t(recovery.returnLabelKey)}
        </Link>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-8 pb-6 sm:space-y-10">
      <Link
        to={recovery.returnTo}
        replace
        className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t(recovery.returnLabelKey)}
      </Link>

      <header className="grid min-w-0 items-start gap-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <div className="mx-auto aspect-square w-full max-w-60 self-start overflow-hidden rounded-xl bg-muted shadow-lg shadow-black/15 ring-1 ring-black/5 dark:shadow-black/35 dark:ring-white/10 sm:mx-0 sm:max-w-none">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt=""
              width={300}
              height={300}
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Music2
                aria-hidden="true"
                className="size-14 text-muted-foreground/50"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {t("eyebrow")}
            </p>

            <h1 className="mt-3 text-balance wrap-break-word text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {album.name}
            </h1>

            <p className="mt-3 text-base font-medium text-foreground/75 sm:text-lg">
              {metadata.artistsLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted-foreground">
            {metadata.releaseDateLabel && album.releaseDate && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="size-3.5" />

                <time dateTime={album.releaseDate}>
                  {metadata.releaseDateLabel}
                </time>
              </span>
            )}

            <span className="inline-flex items-center gap-2">
              <ListMusic aria-hidden="true" className="size-3.5" />
              {t("trackCount", { count: album.totalTracks })}
            </span>
          </div>

          <a
            href={album.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("openSpotify")}
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>

          <AlbumStatus key={album.id} albumId={album.id} />
        </div>
      </header>

      <section className="min-w-0 space-y-4 border-t border-border/50 pt-6">
        <h2 className="text-base font-semibold">{t("tracks")}</h2>

        <AlbumTrackList
          tracks={detail.tracks}
          explicitLabel={t("explicit")}
          openLabel={t("openSpotify")}
        />

        {detail.tracksLoading && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 py-6"
          >
            <RecordLoader size="sm" />

            <p className="text-sm text-muted-foreground">
              {waiting
                ? t("waiting", { count: detail.waitingSeconds })
                : t("loadingTracks")}
            </p>
          </div>
        )}

        {detail.tracksError && !detail.tracksLoading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p
              role="status"
              className="max-w-md text-sm leading-6 text-muted-foreground"
            >
              {t("partialTracks")} {t(detail.tracksErrorKey)}
            </p>

            <LoadingButton
              type="button"
              variant="outline"
              disabled={waiting}
              loading={detail.retryingTracks}
              loadingLabel={t("loadingTracks")}
              onClick={detail.onRetryTracks}
            >
              {t("retryTracks")}
            </LoadingButton>

            {waiting && (
              <p className="text-xs text-muted-foreground">
                {t("retryAvailable", { count: detail.waitingSeconds })}
              </p>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
