import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import type {
  ArtistCatalogPage,
  ArtistCatalogRequest,
  CatalogArtist,
} from "./models/artists.ts";
import { getSpotifyJson } from "./spotifyClient.ts";

const genreGroups: readonly (readonly string[])[] = [
  ["pop", "dance pop", "k-pop", "indie pop", "electropop", "latin pop"],
  ["rock", "alternative rock", "metal", "punk", "indie rock", "classic rock"],
  ["hip hop", "reggaeton", "jazz", "soul", "country", "classical"],
];

const imageSchema = z.object({
  url: z.url().startsWith("https://"),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

const rawArtistSchema = z.object({
  type: z.literal("artist"),
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string().trim().min(1),
  images: z.array(z.unknown()).default([]),
});

const artistSearchSchema = z.object({
  artists: z.object({
    items: z.array(z.unknown()),
    total: z.number().int().nonnegative(),
    next: z.string().nullable(),
  }),
});

export function shuffleArtists<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;

  function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;

    let value = Math.imul(state ^ (state >>> 15), state | 1);

    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));

    const left = result[index];
    const right = result[target];

    if (left === undefined || right === undefined) {
      continue;
    }

    result[index] = right;
    result[target] = left;
  }

  return result;
}

export function discoveryQueries(seed: number, batch: number): string[] {
  if (!Number.isInteger(batch) || batch < 0 || batch >= 6) {
    throw new ApiError(400, "INVALID_REQUEST");
  }

  return genreGroups.map((genres, index) => {
    const genre = shuffleArtists(genres, (seed + index) >>> 0)[batch];

    if (!genre) {
      throw new ApiError(400, "INVALID_REQUEST");
    }

    return `genre:"${genre}"`;
  });
}

export function normalizeArtist(value: unknown): CatalogArtist | null {
  const parsed = rawArtistSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  const images = parsed.data.images
    .flatMap((value) => {
      const image = imageSchema.safeParse(value);

      if (
        !image.success ||
        image.data.width === null ||
        image.data.height === null ||
        image.data.width < 96 ||
        image.data.height < 96
      ) {
        return [];
      }

      return [
        {
          url: image.data.url,
          width: image.data.width,
          height: image.data.height,
        },
      ];
    })
    .sort((left, right) => left.width - right.width);

  const image = images.find((item) => item.width >= 160) ?? images[0];

  if (!image) {
    return null;
  }

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    imageUrl: image.url,
    imageWidth: image.width,
    imageHeight: image.height,
    spotifyUrl: `https://open.spotify.com/artist/${parsed.data.id}`,
  };
}

async function searchArtists(
  query: string,
  offset: number,
  admin: SupabaseClient<Database>,
  market: string,
): Promise<ArtistCatalogPage> {
  const parameters = new URLSearchParams({
    q: query,
    type: "artist",
    market,
    limit: "10",
    offset: String(offset),
  });

  const parsed = artistSearchSchema.safeParse(
    await getSpotifyJson(`search?${parameters}`, admin),
  );

  if (!parsed.success) {
    throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
  }

  const artists = new Map<string, CatalogArtist>();

  for (const raw of parsed.data.artists.items) {
    const artist = normalizeArtist(raw);

    if (artist) {
      artists.set(artist.id, artist);
    }
  }

  const nextOffset = offset + 10;

  return {
    items: [...artists.values()],

    nextOffset:
      parsed.data.artists.next &&
      parsed.data.artists.items.length > 0 &&
      nextOffset < Math.min(parsed.data.artists.total, 1000)
        ? nextOffset
        : null,

    nextBatch: null,
  };
}

export async function getArtists(
  input: ArtistCatalogRequest,
  admin: SupabaseClient<Database>,
  market: string,
): Promise<ArtistCatalogPage> {
  let page: ArtistCatalogPage;

  if (input.query) {
    page = await searchArtists(input.query, input.offset, admin, market);
  } else {
    const queries = discoveryQueries(input.seed, input.batch);

    const artists = new Map<string, CatalogArtist>();

    // Dos consultas simultáneas como máximo.
    // No hay consultas individuales por burbuja.
    for (let index = 0; index < queries.length; index += 2) {
      const pages = await Promise.all(
        queries
          .slice(index, index + 2)
          .map((query) => searchArtists(query, 0, admin, market)),
      );

      for (const result of pages) {
        for (const artist of result.items) {
          artists.set(artist.id, artist);
        }
      }
    }

    page = {
      items: shuffleArtists([...artists.values()], input.seed + input.batch),

      nextOffset: null,

      nextBatch: input.batch < 5 ? input.batch + 1 : null,
    };
  }

  if (page.items.length > 0) {
    const now = Date.now();

    const { error } = await admin.from("artist_cache").upsert(
      page.items.map((artist) => ({
        spotify_artist_id: artist.id,
        name: artist.name,
        image_url: artist.imageUrl,
        image_width: artist.imageWidth,
        image_height: artist.imageHeight,
        fetched_at: new Date(now).toISOString(),
        expires_at: new Date(now + 6 * 60 * 60_000).toISOString(),
      })),
    );

    if (error) {
      throw new ApiError(503, "SERVER_ERROR");
    }
  }

  return page;
}
