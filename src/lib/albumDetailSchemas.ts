import { z } from "zod";

const spotifyIdSchema = z.string().regex(/^[A-Za-z0-9]{22}$/);

export const albumTrackSchema = z.object({
  id: spotifyIdSchema,
  name: z.string(),
  artists: z.array(z.string()),
  durationMs: z.number().int().nonnegative(),
  discNumber: z.number().int().positive(),
  trackNumber: z.number().int().positive(),
  explicit: z.boolean(),
  spotifyUrl: z.url().startsWith("https://open.spotify.com/track/"),
});

export const albumTracksPageSchema = z.object({
  items: z.array(albumTrackSchema),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  nextOffset: z.number().int().nonnegative().nullable(),
});

export const albumDetailSchema = z.object({
  album: z.object({
    id: spotifyIdSchema,
    name: z.string(),
    artists: z.array(
      z.object({
        id: spotifyIdSchema,
        name: z.string(),
      }),
    ),
    coverUrl: z.url().nullable(),
    releaseDate: z.string().nullable(),
    releaseDatePrecision: z.enum(["year", "month", "day"]).nullable(),
    totalTracks: z.number().int().nonnegative(),
    spotifyUrl: z.url().startsWith("https://open.spotify.com/album/"),
  }),
  tracks: albumTracksPageSchema,
});
