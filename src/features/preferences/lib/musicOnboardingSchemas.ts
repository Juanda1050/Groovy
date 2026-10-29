import { z } from "zod";

const spotifyId = z.string().regex(/^[A-Za-z0-9]{22}$/);

const ids = z
  .array(spotifyId)
  .max(100)
  .refine((items) => new Set(items).size === items.length);

export const onboardingArtistSchema = z.object({
  id: spotifyId,
  name: z.string().trim().min(1),
  imageUrl: z.url().startsWith("https://"),
  imageWidth: z.number().int().min(96),
  imageHeight: z.number().int().min(96),
  spotifyUrl: z.url().startsWith("https://open.spotify.com/artist/"),
  genres: z.array(z.string().trim().min(1).max(64)).max(8).default([]),
  genreOffset: z
    .number()
    .int()
    .min(0)
    .max(990)
    .multipleOf(10)
    .nullable()
    .default(null),
});

export const artistPageSchema = z.object({
  items: z.array(onboardingArtistSchema).max(30),
  nextOffset: z.number().int().min(0).max(990).multipleOf(10).nullable(),
  nextBatch: z.number().int().min(1).max(5).nullable(),
});

export const musicOnboardingSchema = z.object({
  user_id: z.uuid(),
  artist_ids: ids.refine((items) => items.length >= 3),
  album_ids: ids,
  track_ids: ids,
  known_album_ids: z
    .array(spotifyId)
    .max(200)
    .refine((items) => new Set(items).size === items.length),
  completed_at: z.iso.datetime({
    offset: true,
  }),
});

export const onboardingArtistIdsSchema = ids.refine(
  (items) => items.length >= 3,
);
