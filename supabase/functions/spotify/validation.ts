import { z } from "zod";
import type { CatalogAlbum } from "./models/spotify.ts";

export const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("search"),
    query: z.string().trim().min(1).max(120),
    offset: z.number().int().min(0).max(990).default(0),
  }),
  z.object({
    action: z.literal("save"),
    albumId: z.string().regex(/^[A-Za-z0-9]{22}$/),
    status: z.enum(["pending", "listened"]),
  }),
  z.object({
    action: z.literal("detail"),
    albumId: z.string().regex(/^[A-Za-z0-9]{22}$/),
  }),
  z.object({
    action: z.literal("tracks"),
    albumId: z.string().regex(/^[A-Za-z0-9]{22}$/),
    offset: z.number().int().min(0).max(100_000),
  }),
]);

const artistSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string(),
});

const rawAlbumSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string(),
  artists: z.array(artistSchema),
  images: z
    .array(
      z.object({
        url: z.url().startsWith("https://"),
        width: z.number().nullish(),
      }),
    )
    .default([]),
  release_date: z.string().nullish(),
  release_date_precision: z.enum(["year", "month", "day"]).nullish(),
  total_tracks: z.number().int().nonnegative(),
});

export const catalogAlbumSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string(),
  artists: z.array(artistSchema),
  coverUrl: z.url().startsWith("https://").nullable(),
  releaseDate: z.string().nullable(),
  releaseDatePrecision: z.enum(["year", "month", "day"]).nullable(),
  totalTracks: z.number().int().nonnegative(),
  spotifyUrl: z.url(),
});

export const searchSchema = z.object({
  albums: z.object({
    items: z.array(rawAlbumSchema),
    next: z.string().nullable().optional(),
  }),
});

export function normalizeAlbum(value: unknown): CatalogAlbum {
  const album = rawAlbumSchema.parse(value);

  const image =
    album.images.find((item) => item.width === 300) ?? album.images.at(-1);

  return {
    id: album.id,
    name: album.name,
    artists: album.artists,
    coverUrl: image?.url ?? null,
    releaseDate: album.release_date ?? null,
    releaseDatePrecision: album.release_date_precision ?? null,
    totalTracks: album.total_tracks,
    spotifyUrl: `https://open.spotify.com/album/${album.id}`,
  };
}
