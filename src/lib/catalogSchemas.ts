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
  nextOffset: z.number().int().nonnegative().nullable(),
});

export const savedCatalogAlbumSchema = z.object({
  id: z.uuid(),
  spotifyAlbumId: z.string(),
  status: z.enum(["pending", "listened"]),
});
