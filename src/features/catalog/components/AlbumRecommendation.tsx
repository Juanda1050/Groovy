import {
  ArrowRight,
  Disc3,
  ExternalLink,
  Eye,
  Music2,
  Plus,
  Shuffle,
  ThumbsDown,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useAlbumRecommendation } from "@/features/catalog/hooks/useAlbumRecommendation";
import { useAlbumReturn } from "@/features/catalog/hooks/useAlbumReturn";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

export function AlbumRecommendation() {
  const { t, i18n } = useTranslation(["discover", "common"]);
  const discovery = useAlbumRecommendation();
  const { detailNavigationState } = useAlbumReturn();
  const coverRef = useRef<HTMLDivElement>(null);
  const recordedId = useRef<string | null>(null);

  const { recommendation, userId, loading, impress } = discovery;

  useEffect(() => {
    if (loading) {
      recordedId.current = null;
      return;
    }

    const element = coverRef.current;

    if (!element || !recommendation || !userId) return;

    let visible = false;

    function recordIfVisible(): void {
      if (
        !visible ||
        document.visibilityState !== "visible" ||
        !recommendation ||
        !userId ||
        recordedId.current === recommendation.id
      ) {
        return;
      }

      recordedId.current = recommendation.id;
      impress({ userId, recommendation });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        visible = Boolean(
          entry?.isIntersecting && entry.intersectionRatio >= 0.5,
        );

        recordIfVisible();
      },
      { threshold: 0.5 },
    );

    observer.observe(element);
    document.addEventListener("visibilitychange", recordIfVisible);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", recordIfVisible);
    };
  }, [recommendation, userId, loading, impress]);

  const emptyReason =
    discovery.response?.state === "empty" ? discovery.response.reason : null;

  let reason = "";

  if (recommendation && !recommendation.discovery) {
    const source = recommendation.reason;

    switch (source.code) {
      case "favorite_artist":
        reason = t(
          source.sourceName
            ? "recommendations.reasons.artist"
            : "recommendations.reasons.artistFallback",
          { name: source.sourceName ?? "" },
        );
        break;

      case "favorite_album_artist":
        reason = t(
          source.sourceName
            ? "recommendations.reasons.album"
            : "recommendations.reasons.albumFallback",
          { name: source.sourceName ?? "" },
        );
        break;

      case "rated_album_artist": {
        const stars =
          typeof source.sourceStars === "number"
            ? new Intl.NumberFormat(i18n.resolvedLanguage ?? "en", {
                maximumFractionDigits: 2,
              }).format(source.sourceStars)
            : "";

        reason = t(
          source.sourceName
            ? "recommendations.reasons.ratedAlbum"
            : "recommendations.reasons.ratedAlbumFallback",
          { name: source.sourceName ?? "", stars },
        );
        break;
      }

      case "favorite_track_artist":
        reason = t(
          source.sourceName
            ? "recommendations.reasons.favoriteTrack"
            : "recommendations.reasons.favoriteTrackFallback",
          { name: source.sourceName ?? "" },
        );
        break;

      case "liked_track_artist":
        reason = t(
          source.sourceName
            ? "recommendations.reasons.likedTrack"
            : "recommendations.reasons.likedTrackFallback",
          { name: source.sourceName ?? "" },
        );
        break;

      case "random_candidate":
        reason = t("recommendations.reasons.random");
        break;
    }
  }

  return (
    <section
      aria-labelledby="album-recommendation-title"
      aria-busy={loading || discovery.saving || discovery.markingKnown}
      className="space-y-6 border-t border-border/40 pt-6"
    >
      <header className="space-y-2">
        <h2
          id="album-recommendation-title"
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          {t("recommendations.title")}
        </h2>
        <p className="max-w-lg text-sm leading-6 text-muted-foreground">
          {t("recommendations.description")}
        </p>
      </header>

      {discovery.errorCode && (
        <Alert variant="destructive">
          <AlertDescription>
            {t(`errors.${discovery.errorCode}`)}
          </AlertDescription>
          <Button
            type="button"
            variant="outline"
            disabled={discovery.busy}
            onClick={discovery.retry}
            className="mt-3 min-h-11"
          >
            {t(
              discovery.waiting ? "recommendations.waiting" : "actions.retry",
              { ns: discovery.waiting ? "discover" : "common" },
            )}
          </Button>
        </Alert>
      )}

      {loading ? (
        <div role="status" aria-live="polite">
          <PageSkeleton variant="recommendation" />
          <span className="sr-only">{t("recommendations.loading")}</span>
        </div>
      ) : !userId ? (
        <p className="text-sm text-muted-foreground">
          {t("recommendations.signIn")}
        </p>
      ) : recommendation && !discovery.queryError ? (
        <div className="grid items-center gap-7 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-8 lg:max-w-4xl lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-12">
          <div ref={coverRef} className="mx-auto w-full max-w-72 sm:max-w-none">
            <Link
              to={`/albums/${recommendation.album.id}`}
              state={detailNavigationState}
              aria-label={t("recommendations.openAlbum", {
                name: recommendation.album.name,
              })}
              className="group block aspect-square overflow-hidden rounded-2xl bg-muted shadow-lg shadow-primary/10 ring-1 ring-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              {recommendation.album.coverUrl ? (
                <img
                  src={recommendation.album.coverUrl}
                  alt=""
                  width={320}
                  height={320}
                  decoding="async"
                  className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none"
                />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <Music2
                    aria-hidden="true"
                    className="size-14 text-primary/50"
                  />
                </span>
              )}
            </Link>
          </div>

          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-primary">
                {t("recommendations.picked")}
              </p>
              <h3 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                <Link
                  to={`/albums/${recommendation.album.id}`}
                  state={detailNavigationState}
                  className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {recommendation.album.name}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground">
                {recommendation.album.artists
                  .map((artist) => artist.name)
                  .join(", ")}
              </p>
            </div>

            {reason && (
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                {reason}
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              <LoadingButton
                type="button"
                loading={discovery.saving}
                loadingLabel={t("actions.saving")}
                disabled={discovery.busy}
                onClick={() => discovery.perform("save")}
                className="min-h-11"
              >
                <Plus aria-hidden="true" />
                {t("actions.save")}
              </LoadingButton>

              <Button
                type="button"
                variant="outline"
                disabled={discovery.busy}
                onClick={discovery.next}
                className="min-h-11"
              >
                <Shuffle aria-hidden="true" />
                {t("recommendations.another")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/40 pt-3">
              <div className="flex flex-wrap items-center gap-x-1">
                <LoadingButton
                  type="button"
                  variant="ghost"
                  loading={discovery.markingKnown}
                  loadingLabel={t("recommendations.markingKnown")}
                  disabled={discovery.busy}
                  onClick={discovery.markKnown}
                  className="min-h-11 px-2 text-xs"
                >
                  <Eye aria-hidden="true" />
                  {t("recommendations.alreadyKnow")}
                </LoadingButton>

                <Button
                  type="button"
                  variant="ghost"
                  disabled={discovery.busy}
                  onClick={() => discovery.perform("not_interested")}
                  className="min-h-11 px-2 text-xs"
                >
                  <ThumbsDown aria-hidden="true" />
                  {t("recommendations.notInterested")}
                </Button>
              </div>

              <a
                href={recommendation.album.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={discovery.busy}
                onClick={(event) => {
                  if (discovery.busy) {
                    event.preventDefault();
                    return;
                  }

                  discovery.perform("open_spotify");
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-disabled:opacity-50"
              >
                <ExternalLink aria-hidden="true" className="size-3.5" />
                {t("recommendations.spotify")}
              </a>
            </div>
          </div>

          <p role="status" aria-live="polite" className="sr-only">
            {t("recommendations.announcement", {
              name: recommendation.album.name,
            })}
          </p>
        </div>
      ) : !discovery.queryError ? (
        <div className="flex flex-col items-center px-3 py-8 text-center sm:py-12">
          <Disc3 aria-hidden="true" className="size-12 text-primary/70" />
          <p
            role="status"
            className="mt-5 max-w-md text-sm leading-6 text-muted-foreground"
          >
            {emptyReason
              ? t(`recommendations.empty.${emptyReason}`)
              : t("recommendations.initial")}
          </p>

          {emptyReason === "needs_preferences" ? (
            <Link
              to="/?catalog=artists"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("recommendations.chooseArtists")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : emptyReason === "needs_metadata" ? (
            <Button
              type="button"
              disabled={discovery.busy}
              onClick={discovery.retry}
              className="mt-5 min-h-11"
            >
              {t("actions.retry", { ns: "common" })}
            </Button>
          ) : emptyReason !== "onboarding_required" ? (
            <Button
              type="button"
              disabled={discovery.busy}
              onClick={discovery.next}
              className="mt-5 min-h-11"
            >
              <Shuffle aria-hidden="true" />
              {t(
                discovery.requestId
                  ? "recommendations.another"
                  : "recommendations.start",
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
