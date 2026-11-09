import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSharedCatalogValue } from "../spotify/artistPageCache.ts";
import { ApiError } from "../spotify/http.ts";
import type { Database } from "../spotify/models/database.ts";
import type { CatalogAlbum } from "../spotify/models/spotify.ts";
import { getSpotifyJson } from "../spotify/spotifyClient.ts";
import { catalogAlbumSchema, normalizeAlbum } from "../spotify/validation.ts";
import {
  shuffle,
  type RecommendationSeed,
  type RecommendationSignals,
  type RecommendationSource,
} from "./recommendationSignals.ts";

type Client = SupabaseClient<Database>;

const spotifyId = z.string().regex(/^[A-Za-z0-9]{22}$/);

export const candidateRouteSchema = z.object({
  origin: z.enum(["direct", "genre", "collaboration", "catalog"]),
  artistId: spotifyId,
  referenceArtistId: spotifyId.nullable(),
  genre: z.string().min(1).max(64).nullable(),
});

export const selectionContextSchema = candidateRouteSchema.extend({
  experiment: z.literal("discovery-v1"),
  policy: z.enum(["personalized", "random"]),
  poolSize: z.number().int().min(1).max(100),
});

type CandidateRoute = z.infer<typeof candidateRouteSchema>;

export interface RecommendationCandidate {
  album: CatalogAlbum;
  source: RecommendationSource;
  route: CandidateRoute;
}

export interface RecentRecommendation {
  artistIds: string[];
  sourceSignal: string | null;
  selectionContext: z.infer<typeof selectionContextSchema> | null;
}

const pageSchema = z.object({
  items: z.array(catalogAlbumSchema).max(10),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
});

const rawPageSchema = z.object({
  items: z.array(z.unknown()).max(10),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
});

type AlbumPage = z.infer<typeof pageSchema>;

const neighborhoodSchema = z.object({
  items: z
    .array(
      z.object({
        album: catalogAlbumSchema,
        route: candidateRouteSchema,
      }),
    )
    .max(30),
  pages: z
    .array(
      z.object({
        artistId: spotifyId,
        route: candidateRouteSchema,
        total: z.number().int().nonnegative(),
      }),
    )
    .max(2),
  catalogTotal: z.number().int().nonnegative(),
});

type Neighborhood = z.infer<typeof neighborhoodSchema>;

export interface CandidatePool {
  candidates: RecommendationCandidate[];
  neighborhood: Neighborhood;
  source: RecommendationSource | null;
  bucket: number;
  allowDiscovery: boolean;
  failure: ApiError | null;
}

function toFailure(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(503, "SPOTIFY_UNAVAILABLE");
}

function sourceSignal(source: RecommendationSource): string {
  if (source.entityType === "artist") return "favorite_artist";

  if (source.entityType === "album") {
    return source.isFavorite ? "favorite_album_artist" : "rated_album_artist";
  }

  return source.isFavorite ? "favorite_track_artist" : "liked_track_artist";
}

function chooseReference(
  seeds: readonly RecommendationSeed[],
  history: readonly RecentRecommendation[],
): RecommendationSeed | null {
  const ordered = shuffle(seeds).sort((left, right) => {
    const leftSource = history.filter(
      (item) => item.sourceSignal === sourceSignal(left.source),
    ).length;

    const rightSource = history.filter(
      (item) => item.sourceSignal === sourceSignal(right.source),
    ).length;

    const leftArtist = history.filter((item) =>
      item.artistIds.includes(left.artistId),
    ).length;

    const rightArtist = history.filter((item) =>
      item.artistIds.includes(right.artistId),
    ).length;

    return (
      leftSource - rightSource ||
      leftArtist - rightArtist ||
      Number(right.source.isFavorite) - Number(left.source.isFavorite) ||
      Number(left.source.entityType === "artist") -
        Number(right.source.entityType === "artist")
    );
  });

  return ordered[0] ?? null;
}

async function saveAlbums(
  items: readonly CatalogAlbum[],
  admin: Client,
): Promise<void> {
  if (items.length === 0) return;

  const saved = await admin.rpc("cache_recommendation_albums", {
    p_albums: z.json().parse(items),
    p_fetched_at: new Date().toISOString(),
  });

  if (saved.error) {
    console.error("RECOMMENDATION_CATALOG_CACHE_FAILED", saved.error.code);
    throw new ApiError(503, "SERVER_ERROR");
  }
}

async function getAlbumPage(
  kind: "artist" | "catalog",
  artistId: string | null,
  offset: number,
  market: string,
  admin: Client,
): Promise<AlbumPage> {
  return await getSharedCatalogValue(
    `recommendationPage:v3:${kind}:${market}:${artistId ?? "new"}:${offset}`,
    kind === "artist" ? 21600 : 600,
    pageSchema,
    async () => {
      const parameters = new URLSearchParams({
        market,
        limit: "10",
        offset: String(offset),
      });

      let raw: z.infer<typeof rawPageSchema>;

      if (kind === "artist" && artistId) {
        parameters.set("include_groups", "album");

        raw = rawPageSchema.parse(
          await getSpotifyJson(
            `artists/${artistId}/albums?${parameters}`,
            admin,
          ),
        );
      } else {
        parameters.set("q", "tag:new");
        parameters.set("type", "album");

        raw = z
          .object({
            albums: rawPageSchema,
          })
          .parse(await getSpotifyJson(`search?${parameters}`, admin)).albums;
      }

      if (raw.offset !== offset) {
        throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
      }

      const items = raw.items.flatMap((value) => {
        if (kind === "catalog") {
          const type = z
            .object({
              album_type: z.string(),
            })
            .safeParse(value);

          if (!type.success || type.data.album_type !== "album") return [];
        }

        const album = normalizeAlbum(value);

        if (
          !album.name.trim() ||
          album.totalTracks === 0 ||
          album.artists.length === 0 ||
          (kind === "artist" &&
            !album.artists.some((artist) => artist.id === artistId))
        ) {
          return [];
        }

        return [album];
      });

      const unique = [
        ...new Map(items.map((album) => [album.id, album])).values(),
      ];

      // Solo se actualiza SQL cuando realmente se obtuvieron datos nuevos.
      await saveAlbums(unique, admin);

      return {
        items: unique,
        total: raw.total,
        offset,
      };
    },
    admin,
  );
}

async function getGenres(artistId: string, admin: Client): Promise<string[]> {
  const schema = z.object({
    items: z
      .array(
        z.object({
          id: spotifyId,
          genres: z.array(z.string().min(1).max(64)).max(20),
        }),
      )
      .max(1),
  });

  const result = await getSharedCatalogValue(
    `recommendationGenres:v2:${artistId}`,
    600,
    schema,
    async () => {
      try {
        const artist = z
          .object({
            id: spotifyId,
            genres: z.array(z.string()).default([]),
          })
          .parse(await getSpotifyJson(`artists/${artistId}`, admin));

        if (artist.id !== artistId) {
          throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
        }

        return {
          items: [
            {
              id: artistId,
              genres: [
                ...new Set(
                  artist.genres
                    .map((genre) => genre.trim())
                    .filter(
                      (genre) =>
                        genre.length > 0 &&
                        genre.length <= 64 &&
                        !/["\\\r\n]/.test(genre),
                    ),
                ),
              ].slice(0, 20),
            },
          ],
        };
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) {
          return { items: [] };
        }

        throw error;
      }
    },
    admin,
  );

  return result.items[0]?.genres ?? [];
}

async function getCollaborators(
  albumId: string,
  artistId: string,
  market: string,
  admin: Client,
): Promise<string[]> {
  const schema = z.object({
    items: z
      .array(
        z.object({
          artistIds: z.array(spotifyId),
        }),
      )
      .max(10),
  });

  const result = await getSharedCatalogValue(
    `recommendationCredits:v2:${market}:${albumId}`,
    21600,
    schema,
    async () => {
      const parameters = new URLSearchParams({
        market,
        limit: "10",
        offset: "0",
      });

      const raw = z
        .object({
          items: z.array(z.unknown()).max(10),
        })
        .parse(
          await getSpotifyJson(`albums/${albumId}/tracks?${parameters}`, admin),
        );

      return {
        items: raw.items.flatMap((value) => {
          const track = z
            .object({
              artists: z.array(z.object({ id: spotifyId })),
            })
            .safeParse(value);

          return track.success
            ? [
                {
                  artistIds: [
                    ...new Set(track.data.artists.map((artist) => artist.id)),
                  ],
                },
              ]
            : [];
        }),
      };
    },
    admin,
  );

  return [
    ...new Set(
      result.items
        .filter((track) => track.artistIds.includes(artistId))
        .flatMap((track) => track.artistIds)
        .filter((id) => id !== artistId),
    ),
  ];
}

async function searchGenre(
  genre: string,
  market: string,
  admin: Client,
): Promise<string[]> {
  const schema = z.object({
    items: z.array(z.object({ id: spotifyId })).max(10),
  });

  const result = await getSharedCatalogValue(
    `recommendationGenreSearch:v2:${market}:${genre}`,
    21600,
    schema,
    async () => {
      const parameters = new URLSearchParams({
        q: `genre:"${genre}"`,
        type: "artist",
        market,
        limit: "10",
        offset: "0",
      });

      const raw = z
        .object({
          artists: z.object({
            items: z.array(z.unknown()).max(10),
          }),
        })
        .parse(await getSpotifyJson(`search?${parameters}`, admin));

      return {
        items: raw.artists.items.flatMap((value) => {
          const artist = z.object({ id: spotifyId }).safeParse(value);
          return artist.success ? [artist.data] : [];
        }),
      };
    },
    admin,
  );

  return result.items.map((artist) => artist.id);
}

async function buildNeighborhood(
  artistId: string,
  allowDiscovery: boolean,
  market: string,
  admin: Client,
): Promise<Neighborhood> {
  const result: Neighborhood = {
    items: [],
    pages: [],
    catalogTotal: 0,
  };

  let failure: ApiError | null = null;

  const initial = await Promise.allSettled([
    getAlbumPage("artist", artistId, 0, market, admin),
    allowDiscovery
      ? getAlbumPage("catalog", null, 0, market, admin)
      : Promise.resolve<AlbumPage>({ items: [], total: 0, offset: 0 }),
  ]);

  const direct = initial[0];
  const catalog = initial[1];

  if (direct?.status === "fulfilled") {
    const route: CandidateRoute = {
      origin: "direct",
      artistId,
      referenceArtistId: artistId,
      genre: null,
    };

    result.pages.push({
      artistId,
      route,
      total: direct.value.total,
    });

    result.items.push(...direct.value.items.map((album) => ({ album, route })));
  } else if (direct?.status === "rejected") {
    failure = toFailure(direct.reason);
  }

  if (catalog?.status === "fulfilled") {
    result.catalogTotal = catalog.value.total;

    for (const album of catalog.value.items) {
      const artist = album.artists[0];

      if (!artist) continue;

      result.items.push({
        album,
        route: {
          origin: "catalog",
          artistId: artist.id,
          referenceArtistId: null,
          genre: null,
        },
      });
    }
  } else if (catalog?.status === "rejected") {
    failure ??= toFailure(catalog.reason);
  }

  if (allowDiscovery) {
    const albumId =
      direct?.status === "fulfilled"
        ? (direct.value.items[0]?.id ?? null)
        : null;

    const [genresResult, collaboratorsResult] = await Promise.allSettled([
      getGenres(artistId, admin),
      albumId
        ? getCollaborators(albumId, artistId, market, admin)
        : Promise.resolve<string[]>([]),
    ]);

    const genres =
      genresResult?.status === "fulfilled" ? genresResult.value : [];

    const collaborators =
      collaboratorsResult?.status === "fulfilled"
        ? collaboratorsResult.value
        : [];

    for (const item of [genresResult, collaboratorsResult]) {
      if (item?.status === "rejected") failure ??= toFailure(item.reason);
    }

    let target = collaborators[0] ?? null;
    let origin: "collaboration" | "genre" = "collaboration";
    let genre: string | null = null;

    const genreOption = genres[0] ?? null;

    if (genreOption && (!target || new Date().getUTCDate() % 2 === 0)) {
      try {
        const artists = await searchGenre(genreOption, market, admin);
        const alternative = artists.find((id) => id !== artistId);

        if (alternative) {
          target = alternative;
          origin = "genre";
          genre = genreOption;
        }
      } catch (error: unknown) {
        failure ??= toFailure(error);
      }
    }

    if (target) {
      try {
        const page = await getAlbumPage("artist", target, 0, market, admin);

        const route: CandidateRoute = {
          origin,
          artistId: target,
          referenceArtistId: artistId,
          genre,
        };

        result.pages.push({
          artistId: target,
          route,
          total: page.total,
        });

        result.items.push(...page.items.map((album) => ({ album, route })));
      } catch (error: unknown) {
        failure ??= toFailure(error);
      }
    }
  }

  if (result.items.length === 0 && failure) throw failure;

  if (failure) {
    console.warn("RECOMMENDATION_PARTIAL_CATALOG", failure.code);
  }

  return result;
}

export async function loadRecommendationCandidates({
  signals,
  history,
  requestId,
  allowDiscovery,
  market,
  admin,
  signal,
}: {
  signals: RecommendationSignals;
  history: readonly RecentRecommendation[];
  knownArtistIds: ReadonlySet<string>;
  requestId: string;
  allowDiscovery: boolean;
  market: string;
  admin: Client;
  signal: AbortSignal;
}): Promise<CandidatePool> {
  const reference = chooseReference(signals.seeds, history);

  if (!reference) {
    return {
      candidates: [],
      neighborhood: { items: [], pages: [], catalogTotal: 0 },
      source: null,
      bucket: 1,
      allowDiscovery,
      failure: null,
    };
  }

  signal.throwIfAborted();

  const neighborhood = await getSharedCatalogValue(
    `recommendationNeighborhood:v3:${market}:${reference.artistId}:${allowDiscovery}`,
    600,
    neighborhoodSchema,
    () => buildNeighborhood(reference.artistId, allowDiscovery, market, admin),
    admin,
  );

  signal.throwIfAborted();

  return {
    candidates: neighborhood.items.map((item) => ({
      ...item,
      source: reference.source,
    })),
    neighborhood,
    source: reference.source,
    bucket: 1 + (Number.parseInt(requestId.slice(-2), 16) % 5),
    allowDiscovery,
    failure: null,
  };
}

export async function expandRecommendationCandidates(
  pool: CandidatePool,
  market: string,
  admin: Client,
  signal: AbortSignal,
): Promise<void> {
  const source = pool.source;

  if (!source) return;

  const page =
    pool.neighborhood.pages.find(
      (item) => item.route.origin !== "direct" && item.total > 10,
    ) ?? pool.neighborhood.pages.find((item) => item.total > 10);

  const jobs: Promise<void>[] = [];

  if (page) {
    const lastPage = Math.ceil(page.total / 10) - 1;
    const offset = Math.min(pool.bucket, lastPage) * 10;

    jobs.push(
      getAlbumPage("artist", page.artistId, offset, market, admin).then(
        (loaded) => {
          pool.candidates.push(
            ...loaded.items.map((album) => ({
              album,
              source,
              route: page.route,
            })),
          );
        },
      ),
    );
  }

  if (pool.allowDiscovery && pool.neighborhood.catalogTotal > 10) {
    const lastPage = Math.min(
      99,
      Math.ceil(pool.neighborhood.catalogTotal / 10) - 1,
    );

    const offset = Math.min(pool.bucket, lastPage) * 10;

    jobs.push(
      getAlbumPage("catalog", null, offset, market, admin).then((loaded) => {
        for (const album of loaded.items) {
          const artist = album.artists[0];

          if (!artist) continue;

          pool.candidates.push({
            album,
            source,
            route: {
              origin: "catalog",
              artistId: artist.id,
              referenceArtistId: null,
              genre: null,
            },
          });
        }
      }),
    );
  }

  const results = await Promise.allSettled(jobs);

  for (const result of results) {
    if (result.status === "rejected") {
      pool.failure ??= toFailure(result.reason);
    }
  }

  signal.throwIfAborted();
}
