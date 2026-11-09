import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSharedCatalogValue } from "../spotify/artistPageCache.ts";
import { getAlbum, getTrackMetadataBatch } from "../spotify/catalogMetadata.ts";
import { ApiError } from "../spotify/http.ts";
import type { Database } from "../spotify/models/database.ts";
import type { CatalogAlbum } from "../spotify/models/spotify.ts";
import { getSpotifyJson } from "../spotify/spotifyClient.ts";
import { catalogAlbumSchema, normalizeAlbum } from "../spotify/validation.ts";
import {
  getAlbumSignalEvidence,
  loadRecommendationSignals,
  rankRecommendationCandidates,
  recommendationContextSchema,
  shuffle,
  type RecommendationSeed,
  type RecommendationSignals,
  type RecommendationSource,
} from "./recommendationSignals.ts";

type Client = SupabaseClient<Database>;
type Recommendation =
  Database["public"]["Tables"]["album_recommendations"]["Row"];
type Strategy = "personalized" | "random";

interface Candidate {
  album: CatalogAlbum;
  source: RecommendationSource;
}

interface LastShown {
  id: string | null;
  artistIds: string[];
}

const idSchema = z.string().regex(/^[A-Za-z0-9]{22}$/);

const reasonCodeSchema = z.enum([
  "favorite_artist",
  "favorite_album_artist",
  "rated_album_artist",
  "favorite_track_artist",
  "liked_track_artist",
  "random_candidate",
]);

const rawPageSchema = z.object({
  items: z.array(z.unknown()).max(10),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
});

const albumPageSchema = z.object({
  items: z.array(catalogAlbumSchema).max(10),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
});

type AlbumPage = z.infer<typeof albumPageSchema>;

interface LoadedPage {
  seed: RecommendationSeed;
  page: AlbumPage;
}

function checkDatabaseError(error: { code: string } | null): void {
  if (!error) return;

  if (error.code === "PT401" || error.code === "28000") {
    throw new ApiError(401, "UNAUTHORIZED");
  }

  console.error("RECOMMENDATION_DATABASE_FAILED", error.code);
  throw new ApiError(503, "SERVER_ERROR");
}

async function getLastShown(userId: string, admin: Client): Promise<LastShown> {
  const result = await admin
    .from("album_recommendations")
    .select("id,spotify_album_id,artist_ids")
    .eq("user_id", userId)
    .not("last_shown_at", "is", null)
    .order("last_shown_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  checkDatabaseError(result.error);

  if (!result.data) return { id: null, artistIds: [] };

  const snapshot = z.array(idSchema).safeParse(result.data.artist_ids);

  if (!snapshot.success) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  if (snapshot.data.length > 0) {
    return { id: result.data.id, artistIds: snapshot.data };
  }

  const cached = await admin
    .from("album_cache")
    .select("artists")
    .eq("spotify_album_id", result.data.spotify_album_id)
    .maybeSingle();

  checkDatabaseError(cached.error);

  const artists = z
    .array(z.object({ id: idSchema }))
    .safeParse(cached.data?.artists);

  if (!artists.success || artists.data.length === 0) {
    return { id: result.data.id, artistIds: [] };
  }

  const ids = [...new Set(artists.data.map((artist) => artist.id))];

  const saved = await admin
    .from("album_recommendations")
    .update({ artist_ids: ids })
    .eq("user_id", userId)
    .eq("id", result.data.id)
    .filter("artist_ids", "eq", "{}");

  checkDatabaseError(saved.error);

  return { id: result.data.id, artistIds: ids };
}

function sharesArtists(
  album: CatalogAlbum,
  artistIds: ReadonlySet<string>,
): boolean {
  return album.artists.some((artist) => artistIds.has(artist.id));
}

function prioritizeCandidates(
  candidates: readonly Candidate[],
  artistIds: ReadonlySet<string>,
  signals: RecommendationSignals | null,
): Candidate[] {
  const ranked = signals
    ? rankRecommendationCandidates(
        candidates,
        signals,
        (candidate) => candidate.source.isFavorite,
      )
    : [...candidates];

  return [
    ...ranked.filter((candidate) => !sharesArtists(candidate.album, artistIds)),
    ...ranked.filter((candidate) => sharesArtists(candidate.album, artistIds)),
  ];
}

async function getArtistPage(
  artistId: string,
  offset: number,
  market: string,
  admin: Client,
): Promise<AlbumPage> {
  return await getSharedCatalogValue(
    `recommendationAlbums:v1:${market}:${artistId}:${offset}`,
    6 * 60 * 60,
    albumPageSchema,
    async () => {
      const parameters = new URLSearchParams({
        market,
        include_groups: "album",
        limit: "10",
        offset: String(offset),
      });

      const raw = rawPageSchema.parse(
        await getSpotifyJson(`artists/${artistId}/albums?${parameters}`, admin),
      );

      if (raw.offset !== offset) {
        throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
      }

      const items = raw.items
        .map(normalizeAlbum)
        .filter(
          (album) =>
            album.totalTracks > 0 &&
            album.artists.some((artist) => artist.id === artistId),
        );

      return {
        items: [...new Map(items.map((album) => [album.id, album])).values()],
        total: raw.total,
        offset,
      };
    },
    admin,
  );
}

async function loadPages(
  requests: readonly { seed: RecommendationSeed; offset: number }[],
  market: string,
  admin: Client,
): Promise<{
  pages: LoadedPage[];
  groups: Candidate[][];
  failure: ApiError | null;
}> {
  const results = await Promise.allSettled(
    requests.map(async ({ seed, offset }) => ({
      seed,
      page: await getArtistPage(seed.artistId, offset, market, admin),
    })),
  );

  const pages: LoadedPage[] = [];
  const groups: Candidate[][] = [];
  let failure: ApiError | null = null;

  for (const result of results) {
    if (result.status === "rejected") {
      failure ??=
        result.reason instanceof ApiError
          ? result.reason
          : new ApiError(503, "SPOTIFY_UNAVAILABLE");
      continue;
    }

    pages.push(result.value);
    groups.push(
      result.value.page.items.map((album) => ({
        album,
        source: result.value.seed.source,
      })),
    );
  }

  return { pages, groups, failure };
}

async function filterCandidates(
  candidates: readonly Candidate[],
  userClient: Client,
): Promise<Candidate[]> {
  const byId = new Map<string, Candidate>();

  for (const candidate of candidates) {
    const previous = byId.get(candidate.album.id);

    if (
      !previous ||
      (!previous.source.isFavorite && candidate.source.isFavorite)
    ) {
      byId.set(candidate.album.id, candidate);
    }
  }

  const unique = [...byId.values()];

  if (unique.length === 0) return [];

  const result = await userClient.rpc("filter_my_recommendation_candidates", {
    p_album_ids: unique.map((candidate) => candidate.album.id),
  });

  checkDatabaseError(result.error);

  const parsed = z.array(idSchema).max(100).safeParse(result.data);

  if (!parsed.success || parsed.data.some((id) => !byId.has(id))) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  const allowed = new Set(parsed.data);

  return unique.filter((candidate) => allowed.has(candidate.album.id));
}

function arrangeCandidates(
  groups: readonly Candidate[][],
  strategy: Strategy,
): Candidate[] {
  const shuffledGroups = shuffle(groups).map((group) => shuffle(group));

  if (strategy === "random") return shuffle(shuffledGroups.flat());

  const result: Candidate[] = [];
  const length = Math.max(0, ...shuffledGroups.map((group) => group.length));

  for (let index = 0; index < length; index += 1) {
    for (const group of shuffledGroups) {
      const candidate = group[index];

      if (candidate) result.push(candidate);
    }
  }

  return result;
}

function chooseSeeds(
  seeds: readonly RecommendationSeed[],
): RecommendationSeed[] {
  const favorite = seeds.find((seed) => seed.source.isFavorite);
  const other = seeds.find((seed) => !seed.source.isFavorite);
  const chosen: RecommendationSeed[] = [];

  if (favorite) chosen.push(favorite);
  if (other) chosen.push(other);

  for (const seed of seeds) {
    if (chosen.length >= 2) break;

    if (!chosen.some((item) => item.artistId === seed.artistId)) {
      chosen.push(seed);
    }
  }

  return chosen;
}

async function createResponse(
  recommendation: Recommendation,
  market: string,
  userClient: Client,
  admin: Client,
  previousId?: string | null,
  signals: RecommendationSignals | null = null,
) {
  const album = await getAlbum(recommendation.spotify_album_id, market, admin);
  let sourceName: string | null = null;

  if (recommendation.source_entity_type === "artist") {
    const artist = album.artists.find(
      (item) => item.id === recommendation.source_spotify_id,
    );

    if (!artist) return { state: "empty", reason: "selection_changed" };

    sourceName = artist.name;
  } else if (
    recommendation.source_entity_type === "album" &&
    recommendation.source_spotify_id
  ) {
    let sourceAlbum: CatalogAlbum;

    try {
      sourceAlbum = await getAlbum(
        recommendation.source_spotify_id,
        market,
        admin,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404) {
        return { state: "empty", reason: "selection_changed" };
      }

      throw error;
    }

    if (
      !sharesArtists(
        album,
        new Set(sourceAlbum.artists.map((artist) => artist.id)),
      )
    ) {
      return { state: "empty", reason: "selection_changed" };
    }

    sourceName = sourceAlbum.name;
  } else if (
    recommendation.source_entity_type === "track" &&
    recommendation.source_spotify_id
  ) {
    const sourceId = recommendation.source_spotify_id;
    const metadata = await getTrackMetadataBatch([sourceId], market, admin, 1);

    if (metadata.failure) throw metadata.failure;

    const track = metadata.items.get(sourceId);

    if (
      !track ||
      !metadata.freshIds.has(sourceId) ||
      !sharesArtists(album, new Set(track.artistIds))
    ) {
      return { state: "empty", reason: "selection_changed" };
    }

    sourceName = track.name;
  }

  const active = await userClient.rpc("get_my_active_recommendation", {
    p_recommendation_id: recommendation.id,
  });

  checkDatabaseError(active.error);

  if (!active.data?.id) {
    return { state: "empty", reason: "selection_changed" };
  }

  if (
    active.data.user_id !== recommendation.user_id ||
    active.data.spotify_album_id !== album.id
  ) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  const fallbackCode =
    active.data.strategy === "random"
      ? "random_candidate"
      : active.data.source_entity_type === "artist"
        ? "favorite_artist"
        : active.data.source_entity_type === "album"
          ? "favorite_album_artist"
          : null;

  const parsedCode = reasonCodeSchema.safeParse(
    active.data.source_signal ?? fallbackCode,
  );

  if (!parsedCode.success) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  let sourceStars: number | null = null;

  if (parsedCode.data === "rated_album_artist") {
    const rating = active.data.source_rating;

    if (
      rating === null ||
      !Number.isFinite(rating) ||
      rating < 8 ||
      rating > 10
    ) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    sourceStars = rating / 2;
  }

  if (previousId !== undefined) {
    const latest = await getLastShown(recommendation.user_id, admin);

    if (
      latest.id !== previousId &&
      latest.id !== recommendation.id &&
      sharesArtists(album, new Set(latest.artistIds))
    ) {
      return { state: "empty", reason: "selection_changed" };
    }
  }

  return {
    state: "ready",
    recommendation: {
      id: active.data.id,
      requestId: active.data.request_id,
      algorithmVersion: active.data.algorithm_version,
      strategy: active.data.strategy,
      createdAt: active.data.created_at,
      album,
      reason: {
        code: parsedCode.data,
        sourceEntityType: active.data.source_entity_type,
        sourceSpotifyId: active.data.source_spotify_id,
        sourceName,
        sourceStars,
      },
      signalSnapshotAt: signals?.snapshotAt ?? null,
      rankingSignals: signals ? getAlbumSignalEvidence(album, signals) : [],
    },
  };
}

export async function getAlbumRecommendation({
  userId,
  requestId,
  strategy,
  supportsRatedAlbums = false,
  supportsTrackSources = false,
  market,
  signal,
  userClient,
  admin,
}: {
  userId: string;
  requestId: string;
  strategy: Strategy;
  supportsRatedAlbums?: boolean;
  supportsTrackSources?: boolean;
  market: string;
  signal: AbortSignal;
  userClient: Client;
  admin: Client;
}) {
  signal.throwIfAborted();

  const existing = await admin
    .from("album_recommendations")
    .select("*")
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .maybeSingle();

  checkDatabaseError(existing.error);

  if (existing.data) {
    if (existing.data.strategy !== strategy) {
      throw new ApiError(400, "INVALID_REQUEST");
    }

    if (
      (!supportsRatedAlbums &&
        existing.data.source_signal === "rated_album_artist") ||
      (!supportsTrackSources && existing.data.source_entity_type === "track")
    ) {
      return { state: "empty", reason: "selection_changed" };
    }

    const active = await userClient.rpc("get_my_active_recommendation", {
      p_recommendation_id: existing.data.id,
    });

    checkDatabaseError(active.error);

    if (!active.data?.id) {
      return { state: "empty", reason: "selection_changed" };
    }

    return await createResponse(active.data, market, userClient, admin);
  }

  const contextResult = await userClient.rpc("get_my_recommendation_context");

  checkDatabaseError(contextResult.error);

  const parsedContext = recommendationContextSchema.safeParse(
    contextResult.data,
  );

  if (!parsedContext.success || parsedContext.data.userId !== userId) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  const context = parsedContext.data;

  if (!context.onboardingCompleted) {
    return { state: "empty", reason: "onboarding_required" };
  }

  const availableSignals = await loadRecommendationSignals(
    {
      ...context,
      albumRatings: supportsRatedAlbums ? context.albumRatings : [],
      trackSignals: supportsTrackSources ? context.trackSignals : [],
    },
    market,
    admin,
  );

  const signals = strategy === "personalized" ? availableSignals : null;

  signal.throwIfAborted();

  const previous = await getLastShown(userId, admin);
  const previousArtists = new Set(previous.artistIds);
  const uniqueSeedMap = new Map<string, RecommendationSeed>();

  for (const seed of shuffle(availableSignals.seeds)) {
    const previousSeed = uniqueSeedMap.get(seed.artistId);

    if (
      !previousSeed ||
      (!previousSeed.source.isFavorite && seed.source.isFavorite)
    ) {
      uniqueSeedMap.set(seed.artistId, seed);
    }
  }

  const uniqueSeeds = shuffle([...uniqueSeedMap.values()]);
  const preferredSeeds = uniqueSeeds.filter(
    (seed) => !previousArtists.has(seed.artistId),
  );
  const repeatedSeeds = uniqueSeeds.filter((seed) =>
    previousArtists.has(seed.artistId),
  );

  const selectedSeeds =
    preferredSeeds.length >= 2
      ? chooseSeeds(preferredSeeds)
      : [
          ...preferredSeeds,
          ...chooseSeeds(repeatedSeeds).slice(0, 2 - preferredSeeds.length),
        ];

  if (selectedSeeds.length === 0) {
    if (availableSignals.metadataFailure) {
      throw availableSignals.metadataFailure;
    }

    return {
      state: "empty",
      reason: availableSignals.hasReferences
        ? "needs_metadata"
        : "needs_preferences",
    };
  }

  const first = await loadPages(
    selectedSeeds.map((seed) => ({ seed, offset: 0 })),
    market,
    admin,
  );

  const groups = [...first.groups];
  let failure = first.failure;

  signal.throwIfAborted();

  let candidates = await filterCandidates(
    arrangeCandidates(groups, strategy),
    userClient,
  );

  const needsMore =
    candidates.length === 0 ||
    (previousArtists.size > 0 &&
      !candidates.some(
        (candidate) => !sharesArtists(candidate.album, previousArtists),
      ));

  if (needsMore && !failure) {
    const more = await loadPages(
      first.pages
        .filter(({ page }) => page.total > 10)
        .map(({ seed, page }) => {
          const lastPage = Math.min(10_000, Math.ceil(page.total / 10) - 1);

          return {
            seed,
            offset: (1 + Math.floor(Math.random() * lastPage)) * 10,
          };
        }),
      market,
      admin,
    );

    groups.push(...more.groups);
    failure ??= more.failure;

    signal.throwIfAborted();

    candidates = await filterCandidates(
      arrangeCandidates(groups, strategy),
      userClient,
    );
  }

  if (
    !failure &&
    !candidates.some(
      (candidate) => !sharesArtists(candidate.album, previousArtists),
    )
  ) {
    const selectedIds = new Set(selectedSeeds.map((seed) => seed.artistId));
    const extra = await loadPages(
      [...preferredSeeds, ...repeatedSeeds]
        .filter((seed) => !selectedIds.has(seed.artistId))
        .slice(0, 2)
        .map((seed) => ({ seed, offset: 0 })),
      market,
      admin,
    );

    groups.push(...extra.groups);
    failure ??= extra.failure;

    signal.throwIfAborted();

    candidates = await filterCandidates(
      arrangeCandidates(groups, strategy),
      userClient,
    );
  }

  if (candidates.length === 0) {
    if (failure) throw failure;

    return { state: "empty", reason: "no_candidates_in_batch" };
  }

  const rejected = new Set<string>();
  const hydrated = new Map<string, CatalogAlbum>();
  let metadataAttempts = 0;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    signal.throwIfAborted();

    const latest = await getLastShown(userId, admin);
    const avoidedArtists = new Set(latest.artistIds);

    const remaining = candidates
      .filter((candidate) => !rejected.has(candidate.album.id))
      .map((candidate) => ({
        ...candidate,
        album: hydrated.get(candidate.album.id) ?? candidate.album,
      }));

    const candidate = prioritizeCandidates(
      remaining,
      avoidedArtists,
      signals,
    )[0];

    if (!candidate) break;

    let album = hydrated.get(candidate.album.id);

    if (!album) {
      if (metadataAttempts >= 3) break;

      metadataAttempts += 1;

      try {
        album = await getAlbum(candidate.album.id, market, admin);
        hydrated.set(album.id, album);
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) {
          rejected.add(candidate.album.id);
          continue;
        }

        throw error;
      }
    }

    const repeatsArtist = sharesArtists(album, avoidedArtists);

    if (
      repeatsArtist &&
      remaining.some(
        (item) =>
          item.album.id !== album.id &&
          !sharesArtists(item.album, avoidedArtists),
      )
    ) {
      continue;
    }

    signal.throwIfAborted();

    const issued = await admin.rpc("issue_diversified_album_recommendation", {
      p_user_id: userId,
      p_request_id: requestId,
      p_album_id: album.id,
      p_strategy: strategy,
      p_allow_repeated_artist: repeatsArtist,
      ...(latest.id ? { p_previous_recommendation_id: latest.id } : {}),
      ...(strategy === "personalized"
        ? {
            p_source_entity_type: candidate.source.entityType,
            p_source_spotify_id: candidate.source.spotifyId,
          }
        : {}),
    });

    checkDatabaseError(issued.error);

    if (!issued.data?.id) {
      const updated = await getLastShown(userId, admin);

      if (updated.id === latest.id) {
        rejected.add(candidate.album.id);
      }

      continue;
    }

    if (issued.data.user_id !== userId) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    signal.throwIfAborted();

    return await createResponse(
      issued.data,
      market,
      userClient,
      admin,
      latest.id,
      signals,
    );
  }

  return { state: "empty", reason: "selection_changed" };
}
