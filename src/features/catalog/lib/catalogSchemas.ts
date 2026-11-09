import { z } from "zod";

export const catalogErrorCodeSchema = z.enum([
  "UNAUTHORIZED",
  "INVALID_REQUEST",
  "RATE_LIMITED",
  "SPOTIFY_QUOTA",
  "SPOTIFY_UNAVAILABLE",
  "ALBUM_NOT_FOUND",
  "SERVER_ERROR",
]);

export const catalogErrorSchema = z.object({
  error: catalogErrorCodeSchema,
  retryAfter: z.number().nonnegative().default(0),
});

export const catalogAlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  coverUrl: z.url().nullable(),
  releaseDate: z.string().nullable(),
  totalTracks: z.number(),
  spotifyUrl: z.url(),
  libraryStatus: z.enum(["pending", "listened"]).nullable(),
});

export const catalogPageSchema = z.object({
  items: z.array(catalogAlbumSchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal(50)]),
  nextOffset: z.number().int().nonnegative().nullable(),
});

export const artistAlbumPageSchema = catalogPageSchema.extend({
  items: z
    .array(
      catalogAlbumSchema.extend({
        id: z.string().regex(/^[A-Za-z0-9]{22}$/),
        libraryRating: z.number().finite().nullable(),
      }),
    )
    .max(10),
  limit: z.literal(10),
});

export const savedCatalogAlbumSchema = z.object({
  id: z.uuid(),
  spotifyAlbumId: z.string(),
  status: z.enum(["pending", "listened"]),
});

export const artistDetailSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string().trim().min(1),
  imageUrl: z.url().startsWith("https://").nullable(),
  spotifyUrl: z.url().startsWith("https://open.spotify.com/artist/"),
});