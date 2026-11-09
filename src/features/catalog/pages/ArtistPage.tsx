import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Disc3, ExternalLink, Star, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { z } from "zod";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { getArtistDetail } from "@/features/catalog/services/artistService";
import { useMusicPreferences } from "@/features/preferences/hooks/useMusicPreferences";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const sourceSchema = z.object({
  artistSource: z.object({
    pathname: z.string().regex(/^(?:\/|\/library|\/albums\/[A-Za-z0-9]{22})$/),
    search: z
      .string()
      .max(2048)
      .regex(/^(?:\?[^#]*)?$/),
    state: z.unknown().optional(),
  }),
});

export default function ArtistPage() {
  const { artistId = "" } = useParams<"artistId">();
  const { t } = useTranslation(["discover", "library"]);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const location = useLocation();
  const [failedImage, setFailedImage] = useState<string | null>(null);

  const navigationState: unknown = location.state;
  const parsedSource = sourceSchema.safeParse(navigationState);
  const source = parsedSource.success ? parsedSource.data.artistSource : null;

  const returnTo = source
    ? `${source.pathname}${source.search}`
    : "/?catalog=artists";

  const validId = /^[A-Za-z0-9]{22}$/.test(artistId);

  const artist = useQuery({
    queryKey: ["artistMetadata", userId, artistId],
    enabled: Boolean(userId) && validId,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");
      return getArtistDetail(userId, artistId, signal);
    },
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const preferences = useMusicPreferences(
    "artist",
    userId && validId ? [artistId] : [],
  );

  const favorite = preferences.preferences?.[artistId]?.is_favorite ?? false;

  const data = artist.data;
  const imageVisible = data?.imageUrl && data.imageUrl !== failedImage;

  const albumQuery = data
    ? `artist:"${data.name
        .replace(/["\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 110)}"`
    : "";

  const albumSearch = new URLSearchParams({
    catalog: "albums",
    q: albumQuery,
  });

  return (
    <section className="min-w-0 space-y-6 pb-6">
      <Link
        to={returnTo}
        state={source?.state}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("artistDetail.back")}
      </Link>

      {!userId ? (
        <p className="text-sm text-muted-foreground">
          {t("artists.signInRequired")}
        </p>
      ) : !validId ? (
        <p role="alert" className="text-sm text-destructive">
          {t("artistDetail.invalid")}
        </p>
      ) : artist.isPending ? (
        <div role="status" aria-live="polite">
          <div
            aria-hidden="true"
            className="flex flex-col items-center gap-6 sm:flex-row sm:items-center"
          >
            <Skeleton className="size-32 shrink-0 rounded-full sm:size-40" />
            <div className="w-full max-w-sm space-y-4">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-11 w-40 rounded-lg" />
            </div>
          </div>
          <span className="sr-only">{t("artistDetail.loading")}</span>
        </div>
      ) : artist.isError || !data ? (
        <div role="alert" className="space-y-3 py-6">
          <p className="text-sm text-destructive">{t("artistDetail.error")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={artist.isFetching}
            onClick={() => {
              void artist.refetch();
            }}
          >
            {t("actions.retry", { ns: "library" })}
          </Button>
        </div>
      ) : (
        <>
          <header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            {imageVisible ? (
              <img
                src={data.imageUrl ?? ""}
                alt=""
                width={300}
                height={300}
                decoding="async"
                onError={() => setFailedImage(data.imageUrl)}
                className="size-32 shrink-0 rounded-full object-cover ring-1 ring-border sm:size-40"
              />
            ) : (
              <span className="flex size-32 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:size-40">
                <UserRound aria-hidden="true" className="size-12" />
              </span>
            )}

            <div className="min-w-0">
              <p className="text-xs font-medium text-primary">
                {t("artistDetail.eyebrow")}
              </p>
              <h1 className="mt-2 text-balance wrap-break-word text-3xl font-semibold tracking-tight sm:text-4xl">
                {data.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Button
                  type="button"
                  variant={favorite ? "default" : "outline"}
                  disabled={preferences.disabled}
                  aria-pressed={favorite}
                  aria-label={t(
                    favorite ? "favorites.remove" : "favorites.add",
                    { ns: "library", name: data.name },
                  )}
                  onClick={() =>
                    preferences.onChange(artistId, "favorite", !favorite)
                  }
                  className="min-h-11 rounded-lg"
                >
                  <Star
                    aria-hidden="true"
                    className={favorite ? "fill-current" : undefined}
                  />
                  {t(
                    favorite
                      ? "artistDetail.favorited"
                      : "artistDetail.favorite",
                  )}
                </Button>

                <a
                  href={data.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("artistDetail.spotify")}
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </div>
            </div>
          </header>

          {preferences.readError && (
            <div role="alert" className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-destructive">
                {t("favorites.loadError", { ns: "library" })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={preferences.onRetry}
              >
                {t("actions.retry", { ns: "library" })}
              </Button>
            </div>
          )}

          <div className="border-t border-border/40 pt-5">
            <Link
              to={`/?${albumSearch}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Disc3 aria-hidden="true" className="size-4" />
              {t("artistDetail.albums")}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
