import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSharedArtistPage } from "./artistPageCache.ts";
import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import type {
  ArtistCandidate,
  ArtistCandidatePage,
  ArtistCatalogPage,
  ArtistCatalogRequest,
  CatalogArtist,
} from "./models/artists.ts";
import { getSpotifyJson } from "./spotifyClient.ts";

const genreGroups: readonly (readonly string[])[] = [
  ["pop", "dance pop", "k-pop", "latin pop", "indie pop", "electropop"],
  ["rock", "alternative rock", "metal", "punk", "indie rock", "classic rock"],
  ["hip hop", "reggaeton", "trap latino", "rap", "regional mexican", "latin"],
  ["jazz", "soul", "r&b", "funk", "blues", "neo soul"],
  ["electronic", "country", "classical", "folk", "dance", "disco"],
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
  genres: z.array(z.string()).default([]),
  popularity: z.number().int().min(0).max(100).nullish(),
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

  const order = shuffleArtists(
    genreGroups.map((_, index) => index),
    seed,
  );

  return [0, 1, 2].map((position) => {
    const step = batch * 3 + position;
    const groupIndex = order[step % order.length];

    if (groupIndex === undefined) {
      throw new ApiError(400, "INVALID_REQUEST");
    }

    const group = genreGroups[groupIndex];

    if (!group) {
      throw new ApiError(400, "INVALID_REQUEST");
    }

    const genres = shuffleArtists(group, seed + groupIndex);

    const genre = genres[Math.floor(step / order.length)];

    if (!genre) {
      throw new ApiError(400, "INVALID_REQUEST");
    }

    return `genre:"${genre}"`;
  });
}

function normalizeCandidate(
  value: unknown,
  sourceGenre?: string,
  sourceOffset = 0,
): ArtistCandidate | null {
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

  const image = images.find((item) => item.width >= 300) ?? images.at(-1);

  if (!image) {
    return null;
  }

  const genres = [
    ...new Set([...(sourceGenre ? [sourceGenre] : []), ...parsed.data.genres]),
  ]
    .map((genre) => genre.trim())
    .filter((genre) => genre.length > 0 && genre.length <= 64)
    .slice(0, 8);

  return {
    artist: {
      id: parsed.data.id,
      name: parsed.data.name,
      imageUrl: image.url,
      imageWidth: image.width,
      imageHeight: image.height,
      spotifyUrl: `https://open.spotify.com/artist/${parsed.data.id}`,
      genres,
      genreOffset: sourceGenre ? sourceOffset : null,
    },
    popularity: parsed.data.popularity ?? null,
  };
}

export function normalizeArtist(value: unknown): CatalogArtist | null {
  return normalizeCandidate(value)?.artist ?? null;
}

function rankCandidates(
  candidates: readonly ArtistCandidate[],
  seed: number,
): ArtistCandidate[] {
  const completePopularity =
    candidates.length > 0 &&
    candidates.every((candidate) => candidate.popularity !== null);

  if (!completePopularity) {
    return [...candidates];
  }

  return shuffleArtists(candidates, seed).sort((left, right) => {
    if (left.popularity === null || right.popularity === null) {
      return 0;
    }

    return right.popularity - left.popularity;
  });
}

function balanceCandidates(
  pages: readonly ArtistCandidatePage[],
  seed: number,
): CatalogArtist[] {
  const queues = shuffleArtists(
    pages.map((page, index) => rankCandidates(page.items, seed + index)),
    seed,
  );

  const artists = new Map<string, CatalogArtist>();

  for (let position = 0; position < 10 && artists.size < 30; position += 1) {
    for (const queue of queues) {
      const candidate = queue[position];

      if (candidate && !artists.has(candidate.artist.id)) {
        artists.set(candidate.artist.id, candidate.artist);
      }

      if (artists.size >= 30) {
        break;
      }
    }
  }

  return [...artists.values()];
}

async function searchCandidates(
  query: string,
  offset: number,
  admin: SupabaseClient<Database>,
  market: string,
): Promise<ArtistCandidatePage> {
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

  const sourceGenre = query.match(/^genre:"([^"]+)"$/i)?.[1];

  const candidates = new Map<string, ArtistCandidate>();

  for (const raw of parsed.data.artists.items) {
    const candidate = normalizeCandidate(raw, sourceGenre, offset);

    if (candidate && !candidates.has(candidate.artist.id)) {
      candidates.set(candidate.artist.id, candidate);
    }
  }

  const nextOffset = offset + 10;

  return {
    items: [...candidates.values()],
    nextOffset:
      parsed.data.artists.next &&
      parsed.data.artists.items.length > 0 &&
      nextOffset < Math.min(parsed.data.artists.total, 1000)
        ? nextOffset
        : null,
  };
}

async function loadArtistPage(
  input: ArtistCatalogRequest,
  admin: SupabaseClient<Database>,
  market: string,
): Promise<ArtistCatalogPage> {
  let page: ArtistCatalogPage;

  if (input.query) {
    const result = await searchCandidates(
      input.query,
      input.offset,
      admin,
      market,
    );

    const candidates = /^genre:"[^"]+"$/i.test(input.query)
      ? rankCandidates(result.items, 0)
      : result.items;

    page = {
      items: candidates.map((candidate) => candidate.artist),
      nextOffset: result.nextOffset,
      nextBatch: null,
    };
  } else {
    const queries = discoveryQueries(0, input.batch);

    const pages: ArtistCandidatePage[] = [];

    for (let index = 0; index < queries.length; index += 2) {
      const results = await Promise.all(
        queries
          .slice(index, index + 2)
          .map((query) => searchCandidates(query, 0, admin, market)),
      );

      pages.push(...results);
    }

    page = {
      items: balanceCandidates(pages, input.batch),
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

export async function getArtists(
  input: ArtistCatalogRequest,
  admin: SupabaseClient<Database>,
  market: string,
): Promise<ArtistCatalogPage> {
  const identity = JSON.stringify({
    version: 1,
    market,
    query: input.query ?? null,
    offset: input.query ? input.offset : 0,
    batch: input.query ? 0 : input.batch,
  });

  const page = await getSharedArtistPage(
    identity,
    input.query ? 600 : 21000,
    () => loadArtistPage({ ...input, seed: 0 }, admin, market),
    admin,
  );

  if (input.query) {
    return page;
  }

  return {
    ...page,
    items: shuffleArtists(page.items, input.seed + input.batch),
  };
}
