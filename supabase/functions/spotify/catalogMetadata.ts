import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSharedCatalogValue } from "./artistPageCache.ts";
import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import type { CatalogAlbum } from "./models/spotify.ts";
import { getSpotifyJson } from "./spotifyClient.ts";
import { catalogAlbumSchema, normalizeAlbum } from "./validation.ts";

type Client = SupabaseClient<Database>;
type AlbumRow = Database["public"]["Tables"]["album_cache"]["Row"];

const idSchema = z.string().regex(/^[A-Za-z0-9]{22}$/);
const timestamp = z.iso.datetime({ offset: true });
const positiveTtl = 6 * 60 * 60_000;
const negativeTtl = 10 * 60_000;

export const trackMetadataSchema = z.object({
  id: idSchema,
  name: z.string(),
  artists: z.array(z.string()),
  artistIds: z.array(idSchema).default([]),
  albumId: idSchema,
  albumName: z.string(),
  coverUrl: z.url().startsWith("https://").nullable(),
  durationMs: z.number().int().nonnegative(),
});

type TrackMetadata = z.infer<typeof trackMetadataSchema>;

const rawTrackSchema = z.object({
  id: idSchema,
  name: z.string(),
  is_playable: z.boolean().optional(),
  artists: z.array(z.object({ id: idSchema, name: z.string() })).min(1),
  duration_ms: z.number().int().nonnegative(),
  album: z.object({
    id: idSchema,
    name: z.string(),
    images: z.array(
      z.object({
        url: z.url().startsWith("https://"),
        width: z.number().nullish(),
      }),
    ),
  }),
});

const albumEnvelopeSchema = z.object({
  items: z.array(catalogAlbumSchema).max(1),
  unavailable: z.boolean(),
  fetchedAt: timestamp,
  expiresAt: timestamp,
});

const trackEnvelopeSchema = z.object({
  items: z.array(trackMetadataSchema).max(1),
  unavailable: z.boolean(),
  fetchedAt: timestamp,
  expiresAt: timestamp,
});

const unavailableSchema = z.object({
  unavailable: z.literal(true),
});

export interface TrackMetadataBatch {
  items: Map<string, TrackMetadata>;
  freshIds: Set<string>;
  pendingIds: string[];
  metadataError: boolean;
  failure: ApiError | null;
}

function checkDatabaseError(error: { code: string } | null): void {
  if (!error) return;

  console.error("CATALOG_METADATA_DATABASE_FAILED", error.code);
  throw new ApiError(503, "SERVER_ERROR");
}

function dates(unavailable: boolean) {
  const now = Date.now();

  return {
    fetchedAt: new Date(now).toISOString(),
    expiresAt: new Date(
      now + (unavailable ? negativeTtl : positiveTtl),
    ).toISOString(),
  };
}

export function fromCachedAlbum(row: AlbumRow): CatalogAlbum | null {
  const parsed = catalogAlbumSchema.safeParse({
    id: row.spotify_album_id,
    name: row.name,
    artists: row.artists,
    coverUrl: row.cover_url,
    releaseDate: row.release_date,
    releaseDatePrecision: row.release_date_precision,
    totalTracks: row.total_tracks,
    spotifyUrl: `https://open.spotify.com/album/${row.spotify_album_id}`,
  });

  return parsed.success ? parsed.data : null;
}

export async function getAlbum(
  albumId: string,
  market: string,
  admin: Client,
): Promise<CatalogAlbum> {
  if (!idSchema.safeParse(albumId).success) {
    throw new ApiError(400, "INVALID_REQUEST");
  }

  const cached = await admin
    .from("album_cache")
    .select("*")
    .eq("spotify_album_id", albumId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  checkDatabaseError(cached.error);

  const existing = cached.data ? fromCachedAlbum(cached.data) : null;

  if (existing) return existing;

  const envelope = await getSharedCatalogValue(
    `albumMetadata:v1:${market}:${albumId}`,
    600,
    albumEnvelopeSchema,
    async () => {
      try {
        const raw = await getSpotifyJson(
          `albums/${albumId}?market=${encodeURIComponent(market)}`,
          admin,
        );

        const availability = z
          .object({ is_playable: z.boolean().optional() })
          .parse(raw);

        if (availability.is_playable === false) {
          return {
            items: [],
            unavailable: true,
            ...dates(true),
          };
        }

        const album = normalizeAlbum(raw);

        if (album.id !== albumId || album.artists.length === 0) {
          throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
        }

        return {
          items: [album],
          unavailable: false,
          ...dates(false),
        };
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) {
          return {
            items: [],
            unavailable: true,
            ...dates(true),
          };
        }

        throw error;
      }
    },
    admin,
  );

  if (envelope.unavailable) {
    throw new ApiError(404, "ALBUM_NOT_FOUND");
  }

  const album = envelope.items[0];

  if (
    !album ||
    album.id !== albumId ||
    Date.parse(envelope.expiresAt) <= Date.now()
  ) {
    throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
  }

  const saved = await admin.from("album_cache").upsert({
    spotify_album_id: album.id,
    name: album.name,
    artists: album.artists,
    cover_url: album.coverUrl,
    release_date: album.releaseDate,
    release_date_precision: album.releaseDatePrecision,
    total_tracks: album.totalTracks,
    fetched_at: envelope.fetchedAt,
    expires_at: envelope.expiresAt,
  });

  checkDatabaseError(saved.error);

  return album;
}

async function getTrackEnvelope(
  trackId: string,
  market: string,
  admin: Client,
) {
  return await getSharedCatalogValue(
    `trackMetadata:v2:${market}:${trackId}`,
    600,
    trackEnvelopeSchema,
    async () => {
      try {
        const raw = rawTrackSchema.parse(
          await getSpotifyJson(
            `tracks/${trackId}?market=${encodeURIComponent(market)}`,
            admin,
          ),
        );

        if (raw.id !== trackId) {
          throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
        }

        if (raw.is_playable === false) {
          return {
            items: [],
            unavailable: true,
            ...dates(true),
          };
        }

        const images = [...raw.album.images].sort(
          (left, right) =>
            (left.width ?? Number.MAX_SAFE_INTEGER) -
            (right.width ?? Number.MAX_SAFE_INTEGER),
        );

        const image =
          images.find((item) => (item.width ?? 0) >= 96) ?? images.at(-1);

        const metadata = trackMetadataSchema.parse({
          id: raw.id,
          name: raw.name,
          artists: raw.artists.map((artist) => artist.name),
          artistIds: [...new Set(raw.artists.map((artist) => artist.id))],
          albumId: raw.album.id,
          albumName: raw.album.name,
          coverUrl: image?.url ?? null,
          durationMs: raw.duration_ms,
        });

        return {
          items: [metadata],
          unavailable: false,
          ...dates(false),
        };
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) {
          return {
            items: [],
            unavailable: true,
            ...dates(true),
          };
        }

        throw error;
      }
    },
    admin,
  );
}

export async function getTrackMetadataBatch(
  trackIds: readonly string[],
  market: string,
  admin: Client,
  maxRefresh = 0,
): Promise<TrackMetadataBatch> {
  const ids = [...new Set(trackIds)];

  if (
    ids.length > 300 ||
    ids.some((id) => !idSchema.safeParse(id).success) ||
    !Number.isInteger(maxRefresh) ||
    maxRefresh < 0 ||
    maxRefresh > 10
  ) {
    throw new ApiError(400, "INVALID_REQUEST");
  }

  const items = new Map<string, TrackMetadata>();
  const freshIds = new Set<string>();
  const unavailableIds = new Set<string>();
  const now = Date.now();

  for (let offset = 0; offset < ids.length; offset += 100) {
    const cached = await admin
      .from("track_metadata_cache")
      .select("spotify_track_id,payload,expires_at")
      .eq("market", market)
      .in("spotify_track_id", ids.slice(offset, offset + 100));

    checkDatabaseError(cached.error);

    for (const row of cached.data ?? []) {
      const parsed = trackMetadataSchema.safeParse(row.payload);
      const unavailable = unavailableSchema.safeParse(row.payload).success;
      const fresh = Date.parse(row.expires_at) > now;

      if (unavailable && fresh) {
        unavailableIds.add(row.spotify_track_id);
      }

      if (!parsed.success || parsed.data.id !== row.spotify_track_id) {
        continue;
      }

      items.set(row.spotify_track_id, parsed.data);

      if (fresh && !unavailable && parsed.data.artistIds.length > 0) {
        freshIds.add(row.spotify_track_id);
      }
    }
  }

  const missing = ids
    .filter((id) => !freshIds.has(id) && !unavailableIds.has(id))
    .slice(0, maxRefresh);

  let next = 0;
  let stopped = false;
  let failure: ApiError | null = null;

  const worker = async (): Promise<void> => {
    while (!stopped && next < missing.length) {
      const id = missing[next++];

      if (!id) return;

      try {
        const envelope = await getTrackEnvelope(id, market, admin);

        if (Date.parse(envelope.expiresAt) <= Date.now()) {
          throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
        }

        const metadata = envelope.items[0];

        if (
          !envelope.unavailable &&
          (!metadata || metadata.id !== id || metadata.artistIds.length === 0)
        ) {
          throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
        }

        const payload = envelope.unavailable
          ? { ...items.get(id), unavailable: true }
          : metadata;

        if (!payload) {
          throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
        }

        const saved = await admin.from("track_metadata_cache").upsert({
          spotify_track_id: id,
          market,
          payload,
          fetched_at: envelope.fetchedAt,
          expires_at: envelope.expiresAt,
        });

        checkDatabaseError(saved.error);

        if (envelope.unavailable) {
          unavailableIds.add(id);
        } else if (metadata) {
          items.set(id, metadata);
          freshIds.add(id);
        }
      } catch (error: unknown) {
        const current =
          error instanceof ApiError
            ? error
            : new ApiError(503, "SPOTIFY_UNAVAILABLE");

        failure ??= current;
        stopped = true;
        console.error("TRACK_METADATA_REFRESH_FAILED", current.code);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(2, missing.length) }, () => worker()),
  );

  return {
    items,
    freshIds,
    pendingIds: ids.filter(
      (id) => !freshIds.has(id) && !unavailableIds.has(id),
    ),
    metadataError: failure !== null || ids.some((id) => !freshIds.has(id)),
    failure,
  };
}
