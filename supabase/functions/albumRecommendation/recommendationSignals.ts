import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  fromCachedAlbum,
  getAlbum,
  getTrackMetadataBatch,
} from "../spotify/catalogMetadata.ts";
import { ApiError } from "../spotify/http.ts";
import type { Database } from "../spotify/models/database.ts";
import type { CatalogAlbum } from "../spotify/models/spotify.ts";

const spotifyId = z.string().regex(/^[A-Za-z0-9]{22}$/);
const timestamp = z.iso.datetime({ offset: true });

const trackSignalSchema = z
  .object({
    spotifyId,
    sentiment: z.enum(["like", "dislike"]).nullable(),
    isFavorite: z.boolean(),
    legacy: z.boolean(),
    updatedAt: timestamp,
  })
  .refine((value) => !value.isFavorite || value.sentiment === "like");

const albumRatingSchema = z
  .object({
    spotifyId,
    storedRating: z.number().finite().min(0.5).max(10),
    stars: z.number().finite().min(0).max(5),
    updatedAt: timestamp,
  })
  .refine(
    (value) => value.stars === Math.min(5, Math.max(0, value.storedRating / 2)),
  );

export const recommendationContextSchema = z.object({
  userId: z.uuid(),
  snapshotAt: timestamp,
  onboardingCompleted: z.boolean(),
  favoriteArtistIds: z.array(spotifyId),
  favoriteAlbumIds: z.array(spotifyId),
  albumRatings: z.array(albumRatingSchema),
  trackSignals: z
    .array(trackSignalSchema)
    .refine(
      (items) =>
        new Set(items.map((item) => item.spotifyId)).size === items.length,
    ),
});

type RecommendationContext = z.infer<typeof recommendationContextSchema>;

type SignalKind =
  | "favorite_track"
  | "liked_track"
  | "disliked_track"
  | "rated_album";

export interface RecommendationSource {
  entityType: "artist" | "album" | "track";
  spotifyId: string;
  isFavorite: boolean;
}

export interface RecommendationSeed {
  artistId: string;
  source: RecommendationSource;
}

export interface RecommendationSignalEvidence {
  kind: SignalKind;
  spotifyId: string;
  name: string;
  stars: number | null;
}

export interface RecommendationSignals {
  snapshotAt: string;
  seeds: RecommendationSeed[];
  hasReferences: boolean;
  metadataFailure: ApiError | null;
  favoriteTracks: Map<string, RecommendationSignalEvidence>;
  likedTracks: Map<string, RecommendationSignalEvidence>;
  dislikedTracks: Map<string, RecommendationSignalEvidence>;
  ratedArtists: Map<string, RecommendationSignalEvidence>;
}

export function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    const replacement = result[target];

    if (current !== undefined && replacement !== undefined) {
      result[index] = replacement;
      result[target] = current;
    }
  }

  return result;
}

export async function loadRecommendationSignals(
  context: RecommendationContext,
  market: string,
  admin: SupabaseClient<Database>,
): Promise<RecommendationSignals> {
  const ratings = [...context.albumRatings]
    .filter((rating) => rating.stars >= 4)
    .sort(
      (left, right) =>
        right.stars - left.stars ||
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )
    .slice(0, 100);

  const orderedTracks = [...context.trackSignals].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );

  const tracks = [
    ...orderedTracks.filter((track) => track.isFavorite).slice(0, 100),
    ...orderedTracks
      .filter((track) => track.sentiment === "like" && !track.isFavorite)
      .slice(0, 100),
    ...orderedTracks
      .filter((track) => track.sentiment === "dislike")
      .slice(0, 100),
  ];

  const favoriteAlbumIds = shuffle(context.favoriteAlbumIds).slice(0, 100);
  const favoriteAlbums = new Set(favoriteAlbumIds);
  const albumIds = [
    ...new Set([
      ...favoriteAlbumIds,
      ...ratings.map((rating) => rating.spotifyId),
    ]),
  ];

  const result: RecommendationSignals = {
    snapshotAt: context.snapshotAt,
    seeds: context.favoriteArtistIds.map((artistId) => ({
      artistId,
      source: {
        entityType: "artist",
        spotifyId: artistId,
        isFavorite: true,
      },
    })),
    hasReferences:
      context.favoriteArtistIds.length > 0 ||
      favoriteAlbumIds.length > 0 ||
      ratings.length > 0 ||
      tracks.some((track) => track.sentiment === "like"),
    metadataFailure: null,
    favoriteTracks: new Map(),
    likedTracks: new Map(),
    dislikedTracks: new Map(),
    ratedArtists: new Map(),
  };

  const albums = new Map<string, CatalogAlbum>();
  const trackMetadata = await getTrackMetadataBatch(
    tracks.map((track) => track.spotifyId),
    market,
    admin,
  );

  for (let offset = 0; offset < albumIds.length; offset += 100) {
    const cached = await admin
      .from("album_cache")
      .select("*")
      .in("spotify_album_id", albumIds.slice(offset, offset + 100))
      .gt("expires_at", new Date().toISOString());

    if (cached.error) {
      console.error("RECOMMENDATION_SIGNAL_METADATA_FAILED", cached.error.code);
      throw new ApiError(503, "SERVER_ERROR");
    }

    for (const row of cached.data ?? []) {
      const album = fromCachedAlbum(row);

      if (album && album.artists.length > 0) {
        albums.set(album.id, album);
      }
    }
  }

  const missingAlbums = shuffle(albumIds.filter((id) => !albums.has(id)));
  const missingTracks = trackMetadata.pendingIds;
  const trackBudget =
    missingTracks.length > 0 ? (missingAlbums.length > 0 ? 1 : 2) : 0;
  const albumBudget = 2 - trackBudget;

  const jobs: Promise<void>[] = missingAlbums
    .slice(0, albumBudget)
    .map(async (id) => {
      try {
        const album = await getAlbum(id, market, admin);
        albums.set(id, album);
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) return;
        throw error;
      }
    });

  if (trackBudget > 0) {
    jobs.push(
      getTrackMetadataBatch(
        missingTracks.slice(0, trackBudget),
        market,
        admin,
        trackBudget,
      ).then((loaded) => {
        for (const [id, metadata] of loaded.items) {
          trackMetadata.items.set(id, metadata);
        }

        for (const id of loaded.freshIds) {
          trackMetadata.freshIds.add(id);
        }

        if (loaded.failure) throw loaded.failure;
      }),
    );
  }

  const recovered = await Promise.allSettled(jobs);

  for (const recovery of recovered) {
    if (recovery.status === "fulfilled") continue;

    const failure =
      recovery.reason instanceof ApiError
        ? recovery.reason
        : new ApiError(503, "SPOTIFY_UNAVAILABLE");

    result.metadataFailure ??= failure;
    console.error("RECOMMENDATION_REFERENCE_RECOVERY_FAILED", failure.code);
  }

  for (const id of favoriteAlbumIds) {
    const album = albums.get(id);

    if (!album) continue;

    for (const artist of album.artists) {
      result.seeds.push({
        artistId: artist.id,
        source: {
          entityType: "album",
          spotifyId: id,
          isFavorite: true,
        },
      });
    }
  }

  for (const rating of ratings) {
    const album = albums.get(rating.spotifyId);

    if (!album) continue;

    const evidence: RecommendationSignalEvidence = {
      kind: "rated_album",
      spotifyId: album.id,
      name: album.name,
      stars: rating.stars,
    };

    for (const artist of album.artists) {
      const previous = result.ratedArtists.get(artist.id);

      if (!previous || (previous.stars ?? 0) < rating.stars) {
        result.ratedArtists.set(artist.id, evidence);
      }

      if (!favoriteAlbums.has(album.id)) {
        result.seeds.push({
          artistId: artist.id,
          source: {
            entityType: "album",
            spotifyId: album.id,
            isFavorite: false,
          },
        });
      }
    }
  }

  for (const track of tracks) {
    if (!trackMetadata.freshIds.has(track.spotifyId)) continue;

    const metadata = trackMetadata.items.get(track.spotifyId);

    if (!metadata) continue;

    const kind: SignalKind =
      track.sentiment === "dislike"
        ? "disliked_track"
        : track.isFavorite
          ? "favorite_track"
          : "liked_track";

    const evidence: RecommendationSignalEvidence = {
      kind,
      spotifyId: track.spotifyId,
      name: metadata.name,
      stars: null,
    };

    const target =
      kind === "disliked_track"
        ? result.dislikedTracks
        : kind === "favorite_track"
          ? result.favoriteTracks
          : result.likedTracks;

    if (!target.has(metadata.albumId)) {
      target.set(metadata.albumId, evidence);
    }

    if (track.sentiment !== "like") continue;

    for (const artistId of metadata.artistIds) {
      result.seeds.push({
        artistId,
        source: {
          entityType: "track",
          spotifyId: track.spotifyId,
          isFavorite: track.isFavorite,
        },
      });
    }
  }

  return result;
}

export function getAlbumSignalEvidence(
  album: CatalogAlbum,
  signals: RecommendationSignals,
): RecommendationSignalEvidence[] {
  const evidence: RecommendationSignalEvidence[] = [];

  const disliked = signals.dislikedTracks.get(album.id);
  const favorite = signals.favoriteTracks.get(album.id);
  const liked = signals.likedTracks.get(album.id);

  if (disliked) evidence.push(disliked);
  if (favorite) evidence.push(favorite);
  if (liked) evidence.push(liked);

  let rated: RecommendationSignalEvidence | undefined;

  for (const artist of album.artists) {
    const candidate = signals.ratedArtists.get(artist.id);

    if (candidate && (!rated || (candidate.stars ?? 0) > (rated.stars ?? 0))) {
      rated = candidate;
    }
  }

  if (rated) evidence.push(rated);

  return evidence;
}

export function rankRecommendationCandidates<T extends { album: CatalogAlbum }>(
  candidates: readonly T[],
  signals: RecommendationSignals,
  isFavoriteSource: (candidate: T) => boolean = () => false,
): T[] {
  return candidates
    .map((candidate, index) => {
      const evidence = getAlbumSignalEvidence(candidate.album, signals);

      return {
        candidate,
        index,
        disliked: evidence.some((item) => item.kind === "disliked_track"),
        favorite:
          isFavoriteSource(candidate) ||
          evidence.some((item) => item.kind === "favorite_track"),
        liked: evidence.some((item) => item.kind === "liked_track"),
        rating:
          evidence.find((item) => item.kind === "rated_album")?.stars ?? 0,
      };
    })
    .sort(
      (left, right) =>
        Number(left.disliked) - Number(right.disliked) ||
        Number(right.favorite) - Number(left.favorite) ||
        Number(right.liked) - Number(left.liked) ||
        right.rating - left.rating ||
        left.index - right.index,
    )
    .map((item) => item.candidate);
}
