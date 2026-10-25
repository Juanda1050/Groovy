import { z } from "zod";
import { normalizeAlbum } from "./validation.ts";

const rawTrackSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  artists: z.array(
    z.object({
      name: z.string(),
    }),
  ),
  duration_ms: z.number().int().nonnegative(),
  disc_number: z.number().int().positive(),
  track_number: z.number().int().positive(),
  explicit: z.boolean(),
});

const rawTracksPageSchema = z.object({
  items: z.array(rawTrackSchema),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  next: z.string().nullable(),
});

const rawDetailSchema = z.object({
  tracks: rawTracksPageSchema,
});

export function normalizeTracksPage(value: unknown) {
  const page = rawTracksPageSchema.parse(value);

  return {
    items: page.items.flatMap((track) => {
      if (!track.id || !/^[A-Za-z0-9]{22}$/.test(track.id)) {
        return [];
      }

      return [
        {
          id: track.id,
          name: track.name,
          artists: track.artists.map((artist) => artist.name),
          durationMs: track.duration_ms,
          discNumber: track.disc_number,
          trackNumber: track.track_number,
          explicit: track.explicit,
          spotifyUrl: `https://open.spotify.com/track/${track.id}`,
        },
      ];
    }),
    offset: page.offset,
    limit: page.limit,
    total: page.total,
    nextOffset:
      page.next && page.offset + page.limit < page.total
        ? page.offset + page.limit
        : null,
  };
}

export function normalizeAlbumDetail(value: unknown) {
  const detail = rawDetailSchema.parse(value);

  return {
    album: normalizeAlbum(value),
    tracks: normalizeTracksPage(detail.tracks),
  };
}
