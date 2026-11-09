import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getAlbum, getTrackMetadataBatch } from "../spotify/catalogMetadata.ts";
import { ApiError } from "../spotify/http.ts";
import type { Database } from "../spotify/models/database.ts";
import type { CatalogAlbum } from "../spotify/models/spotify.ts";
import {
  expandRecommendationCandidates,
  loadRecommendationCandidates,
  selectionContextSchema,
  type RecommendationCandidate,
  type RecentRecommendation,
} from "./recommendationCandidates.ts";
import {
  getAlbumSignalEvidence,
  loadRecommendationSignals,
  rankRecommendationCandidates,
  recommendationContextSchema,
  shuffle,
  type RecommendationSignals,
} from "./recommendationSignals.ts";

type Client = SupabaseClient<Database>;
type Recommendation =
  Database["public"]["Tables"]["album_recommendations"]["Row"];
type Strategy = "personalized" | "random";

const spotifyId = z.string().regex(/^[A-Za-z0-9]{22}$/);

const discoveryContextSchema = z.object({
  userId: z.uuid(),
  policy: z.enum(["personalized", "random"]),
  lastShownId: z.uuid().nullable(),
  lastArtistIds: z.array(spotifyId),
  knownArtistIds: z.array(spotifyId),
  history: z
    .array(
      z.object({
        id: z.uuid(),
        artistIds: z.array(spotifyId),
        sourceSignal: z.string().nullable(),
        selectionContext: selectionContextSchema.nullable(),
      }),
    )
    .max(12),
});

type DiscoveryContext = z.infer<typeof discoveryContextSchema>;

const reasonCodeSchema = z.enum([
  "favorite_artist",
  "favorite_album_artist",
  "rated_album_artist",
  "favorite_track_artist",
  "liked_track_artist",
  "random_candidate",
]);

function checkDatabaseError(error: { code: string } | null): void {
  if (!error) return;

  if (error.code === "PT401" || error.code === "28000") {
    throw new ApiError(401, "UNAUTHORIZED");
  }

  console.error("RECOMMENDATION_DATABASE_FAILED", error.code);
  throw new ApiError(503, "SERVER_ERROR");
}

function sharesArtists(
  album: CatalogAlbum,
  artistIds: ReadonlySet<string>,
): boolean {
  return album.artists.some((artist) => artistIds.has(artist.id));
}

async function getDiscoveryContext(
  userId: string,
  userClient: Client,
): Promise<DiscoveryContext> {
  const result = await userClient.rpc(
    "get_my_recommendation_discovery_context",
  );

  checkDatabaseError(result.error);

  const parsed = discoveryContextSchema.safeParse(result.data);

  if (!parsed.success || parsed.data.userId !== userId) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  return parsed.data;
}

function candidateSourceSignal(candidate: RecommendationCandidate): string {
  const source = candidate.source;

  if (source.entityType === "artist") return "favorite_artist";

  if (source.entityType === "album") {
    return source.isFavorite ? "favorite_album_artist" : "rated_album_artist";
  }

  return source.isFavorite ? "favorite_track_artist" : "liked_track_artist";
}

function sourcePreference(candidate: RecommendationCandidate): number {
  if (candidate.source.isFavorite) {
    return candidate.source.entityType === "artist" ? 1 : 0;
  }

  return candidate.source.entityType === "album" ? 2 : 3;
}

async function filterCandidates(
  candidates: readonly RecommendationCandidate[],
  userClient: Client,
): Promise<RecommendationCandidate[]> {
  const byId = new Map<string, RecommendationCandidate>();

  for (const candidate of candidates) {
    const previous = byId.get(candidate.album.id);

    if (!previous || sourcePreference(candidate) < sourcePreference(previous)) {
      byId.set(candidate.album.id, candidate);
    }
  }

  const unique = [...byId.values()];

  if (unique.length === 0) return [];

  if (unique.length > 100) throw new ApiError(503, "SERVER_ERROR");

  const result = await userClient.rpc("filter_my_recommendation_candidates", {
    p_album_ids: unique.map((candidate) => candidate.album.id),
  });

  checkDatabaseError(result.error);

  const parsed = z.array(spotifyId).max(100).safeParse(result.data);

  if (!parsed.success || parsed.data.some((id) => !byId.has(id))) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  const allowed = new Set(parsed.data);

  return unique.filter((candidate) => allowed.has(candidate.album.id));
}

function recentArtistCount(
  candidate: RecommendationCandidate,
  history: readonly RecentRecommendation[],
): number {
  return history.filter((item) =>
    sharesArtists(candidate.album, new Set(item.artistIds)),
  ).length;
}

function rankCandidates(
  candidates: readonly RecommendationCandidate[],
  signals: RecommendationSignals,
  context: DiscoveryContext,
  knownArtistIds: ReadonlySet<string>,
  policy: Strategy,
): RecommendationCandidate[] {
  if (policy === "random") return [...candidates];

  const base = rankRecommendationCandidates(
    candidates,
    signals,
    (candidate) => candidate.source.isFavorite,
  );

  const lastArtists = new Set(context.lastArtistIds);

  return base
    .map((candidate, index) => {
      const evidence = getAlbumSignalEvidence(candidate.album, signals);
      const sourceSignal = candidateSourceSignal(candidate);

      return {
        candidate,
        index,
        disliked: evidence.some((item) => item.kind === "disliked_track"),
        repeatsLast: sharesArtists(candidate.album, lastArtists),
        knownArtist: sharesArtists(candidate.album, knownArtistIds),
        recentCount: recentArtistCount(candidate, context.history),
        genreCount: candidate.route.genre
          ? context.history.filter(
              (item) => item.selectionContext?.genre === candidate.route.genre,
            ).length
          : 0,
        sourceCount: context.history.filter(
          (item) => item.sourceSignal === sourceSignal,
        ).length,
        origin:
          candidate.route.origin === "direct"
            ? 2
            : candidate.route.origin === "catalog"
              ? 1
              : 0,
      };
    })
    .sort(
      (left, right) =>
        Number(left.disliked) - Number(right.disliked) ||
        Number(left.repeatsLast) - Number(right.repeatsLast) ||
        Number(left.knownArtist) - Number(right.knownArtist) ||
        left.recentCount - right.recentCount ||
        left.origin - right.origin ||
        left.genreCount - right.genreCount ||
        left.sourceCount - right.sourceCount ||
        left.index - right.index,
    )
    .map((item) => item.candidate);
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
  const parsedSelection = selectionContextSchema
    .nullable()
    .safeParse(recommendation.selection_context);

  if (!parsedSelection.success) throw new ApiError(503, "SERVER_ERROR");

  const selection = parsedSelection.data;
  const discovery = selection !== null && selection.origin !== "direct";

  if (
    selection &&
    !album.artists.some((artist) => artist.id === selection.artistId)
  ) {
    return { state: "empty", reason: "selection_changed" };
  }

  let sourceName: string | null = null;

  if (!discovery && recommendation.source_entity_type === "artist") {
    const artist = album.artists.find(
      (item) => item.id === recommendation.source_spotify_id,
    );

    if (!artist) return { state: "empty", reason: "selection_changed" };

    sourceName = artist.name;
  } else if (
    !discovery &&
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
    !discovery &&
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

  if (!parsedCode.success) throw new ApiError(503, "SERVER_ERROR");

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
    const latest = await getDiscoveryContext(
      recommendation.user_id,
      userClient,
    );

    if (
      latest.lastShownId !== previousId &&
      latest.lastShownId !== recommendation.id &&
      sharesArtists(album, new Set(latest.lastArtistIds))
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
      discovery,
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
  supportsDiscovery = false,
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
  supportsDiscovery?: boolean;
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

    const selection = selectionContextSchema
      .nullable()
      .safeParse(existing.data.selection_context);

    if (!selection.success) throw new ApiError(503, "SERVER_ERROR");

    if (
      (!supportsRatedAlbums &&
        existing.data.source_signal === "rated_album_artist") ||
      (!supportsTrackSources && existing.data.source_entity_type === "track") ||
      (!supportsDiscovery &&
        selection.data !== null &&
        selection.data.origin !== "direct")
    ) {
      return { state: "empty", reason: "selection_changed" };
    }

    return await createResponse(existing.data, market, userClient, admin);
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

  const signals = await loadRecommendationSignals(
    {
      ...context,
      albumRatings: supportsRatedAlbums ? context.albumRatings : [],
      trackSignals: supportsTrackSources ? context.trackSignals : [],
    },
    market,
    admin,
  );

  signal.throwIfAborted();

  if (signals.seeds.length === 0) {
    if (signals.metadataFailure) throw signals.metadataFailure;

    return {
      state: "empty",
      reason: signals.hasReferences ? "needs_metadata" : "needs_preferences",
    };
  }

  let discoveryContext = await getDiscoveryContext(userId, userClient);

  const knownArtistIds = new Set([
    ...discoveryContext.knownArtistIds,
    ...signals.seeds.map((seed) => seed.artistId),
  ]);

  const policy: Strategy =
    strategy === "random"
      ? "random"
      : supportsDiscovery
        ? discoveryContext.policy
        : "personalized";

  const pool = await loadRecommendationCandidates({
    signals,
    history: discoveryContext.history,
    knownArtistIds,
    requestId,
    allowDiscovery: supportsDiscovery,
    market,
    admin,
    signal,
  });

  let candidates = await filterCandidates(pool.candidates, userClient);

  if (
    candidates.length === 0 ||
    (policy === "personalized" &&
      !candidates.some(
        (candidate) =>
          !sharesArtists(candidate.album, knownArtistIds) &&
          recentArtistCount(candidate, discoveryContext.history) === 0,
      ))
  ) {
    await expandRecommendationCandidates(pool, market, admin, signal);
    candidates = await filterCandidates(pool.candidates, userClient);
  }

  if (candidates.length === 0) {
    if (pool.failure) throw pool.failure;

    return { state: "empty", reason: "no_candidates_in_batch" };
  }

  // El orden aleatorio se fija una sola vez por generación.
  candidates = shuffle(candidates);

  const rejected = new Set<string>();
  const hydrated = new Map<string, CatalogAlbum>();
  let metadataAttempts = 0;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    signal.throwIfAborted();

    discoveryContext = await getDiscoveryContext(userId, userClient);

    const remaining = candidates
      .filter((candidate) => !rejected.has(candidate.album.id))
      .map((candidate) => ({
        ...candidate,
        album: hydrated.get(candidate.album.id) ?? candidate.album,
      }));

    const candidate = rankCandidates(
      remaining,
      signals,
      discoveryContext,
      knownArtistIds,
      policy,
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

      continue;
    }

    if (
      !album.artists.some((artist) => artist.id === candidate.route.artistId)
    ) {
      rejected.add(album.id);
      continue;
    }

    const sourceArguments =
      strategy === "personalized"
        ? {
            p_source_entity_type: candidate.source.entityType,
            p_source_spotify_id: candidate.source.spotifyId,
          }
        : {};

    const previousArguments = discoveryContext.lastShownId
      ? { p_previous_recommendation_id: discoveryContext.lastShownId }
      : {};

    const issued = supportsDiscovery
      ? await admin.rpc("issue_discovery_album_recommendation", {
          p_user_id: userId,
          p_request_id: requestId,
          p_album_id: album.id,
          p_strategy: strategy,
          p_context: {
            ...candidate.route,
            experiment: "discovery-v1",
            policy,
            poolSize: candidates.length,
          },
          ...sourceArguments,
          ...previousArguments,
        })
      : await admin.rpc("issue_diversified_album_recommendation", {
          p_user_id: userId,
          p_request_id: requestId,
          p_album_id: album.id,
          p_strategy: strategy,
          p_allow_repeated_artist: sharesArtists(
            album,
            new Set(discoveryContext.lastArtistIds),
          ),
          ...sourceArguments,
          ...previousArguments,
        });

    checkDatabaseError(issued.error);

    if (!issued.data?.id) {
      const latest = await getDiscoveryContext(userId, userClient);

      if (latest.lastShownId === discoveryContext.lastShownId) {
        rejected.add(album.id);
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
      discoveryContext.lastShownId,
      strategy === "personalized" ? signals : null,
    );
  }

  return { state: "empty", reason: "selection_changed" };
}
