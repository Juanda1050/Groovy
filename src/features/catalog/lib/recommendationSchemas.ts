import { z } from "zod";

import { albumDetailSchema } from "@/features/catalog/lib/albumDetailSchemas";

const spotifyId = z.string().regex(/^[A-Za-z0-9]{22}$/);
const timestamp = z.iso.datetime({ offset: true });

export const recommendationRequestSchema = z.object({
  requestId: z.uuid(),
  strategy: z.enum(["personalized", "random"]),
  supportsRatedAlbums: z.boolean().default(true),
  supportsTrackSources: z.boolean().default(true),
  supportsDiscovery: z.boolean().default(true),
});

export const recommendationSchema = z
  .object({
    id: z.uuid(),
    requestId: z.uuid(),
    algorithmVersion: z.string().min(1),
    strategy: z.enum(["personalized", "random"]),
    createdAt: timestamp,
    album: albumDetailSchema.shape.album,
    discovery: z.boolean().default(false),
    reason: z.object({
      code: z.enum([
        "favorite_artist",
        "favorite_album_artist",
        "rated_album_artist",
        "favorite_track_artist",
        "liked_track_artist",
        "random_candidate",
      ]),
      sourceEntityType: z.enum(["artist", "album", "track"]).nullable(),
      sourceSpotifyId: spotifyId.nullable(),
      sourceName: z.string().nullable(),
      sourceStars: z.number().finite().min(1).max(5).nullable().default(null),
    }),
  })
  .refine((value) => {
    const reason = value.reason;

    if (value.strategy === "random") {
      return (
        reason.code === "random_candidate" &&
        reason.sourceEntityType === null &&
        reason.sourceSpotifyId === null &&
        reason.sourceStars === null
      );
    }

    if (!reason.sourceSpotifyId) return false;

    switch (reason.code) {
      case "favorite_artist":
        return (
          reason.sourceEntityType === "artist" &&
          reason.sourceStars === null &&
          (value.discovery ||
            value.album.artists.some(
              (artist) => artist.id === reason.sourceSpotifyId,
            ))
        );

      case "favorite_album_artist":
        return (
          reason.sourceEntityType === "album" && reason.sourceStars === null
        );

      case "rated_album_artist":
        return (
          reason.sourceEntityType === "album" &&
          reason.sourceStars !== null &&
          reason.sourceStars >= 4
        );

      case "favorite_track_artist":
      case "liked_track_artist":
        return (
          reason.sourceEntityType === "track" && reason.sourceStars === null
        );

      case "random_candidate":
        return false;
    }
  });

export const recommendationResponseSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("ready"),
    recommendation: recommendationSchema,
  }),
  z.object({
    state: z.literal("empty"),
    reason: z.enum([
      "selection_changed",
      "onboarding_required",
      "needs_metadata",
      "needs_preferences",
      "no_candidates_in_batch",
    ]),
  }),
]);

export const recommendationEventSchema = z.enum([
  "impression",
  "another",
  "not_interested",
  "open_spotify",
]);

export const recommendationEventResultSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  spotify_album_id: spotifyId,
  impressed_at: timestamp.nullable(),
  another_at: timestamp.nullable(),
  not_interested_at: timestamp.nullable(),
  opened_spotify_at: timestamp.nullable(),
});

export const savedRecommendationSchema = z.object({
  recommendationId: z.uuid(),
  savedAt: timestamp.nullable(),
  album: z.object({
    id: z.uuid(),
    user_id: z.uuid(),
    spotify_album_id: spotifyId,
    status: z.enum(["pending", "listened"]),
    rating: z.number().finite().nullable(),
    review: z.string().nullable(),
    listened_at: timestamp.nullable(),
    created_at: timestamp,
    updated_at: timestamp,
  }),
});

export const knownAlbumSchema = z.object({
  user_id: z.uuid(),
  spotify_album_id: spotifyId,
  is_known: z.boolean(),
  source_recommendation_id: z.uuid().nullable(),
  revision: z.number().int().min(1).max(2147483647),
  created_at: timestamp,
  updated_at: timestamp,
});

export const knownAlbumChangeResultSchema = z.object({
  knownAlbum: knownAlbumSchema,
  changed: z.boolean(),
});
