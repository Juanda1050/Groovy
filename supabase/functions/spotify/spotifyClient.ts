import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import type { CachedSpotifyToken } from "./models/spotify.ts";
import type { SpotifyCacheEntry } from "./models/spotifyCache.ts";

let token: CachedSpotifyToken | null = null;
let tokenRequest: Promise<string> | null = null;

const cache = new Map<string, SpotifyCacheEntry>();

const pending = new Map<string, Promise<unknown>>();

const cacheTtl = 10 * 60_000;
const maxEntries = 20;
const maxBytes = 2 * 1024 * 1024;

let cacheBytes = 0;

const tokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().positive(),
});

function removeCached(path: string): void {
  const entry = cache.get(path);

  if (!entry) {
    return;
  }

  cacheBytes -= entry.bytes;
  cache.delete(path);
}

function readCached(path: string): SpotifyCacheEntry | undefined {
  const entry = cache.get(path);

  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    removeCached(path);
    return undefined;
  }

  cache.delete(path);
  cache.set(path, entry);

  return entry;
}

function storeCached(path: string, value: unknown): void {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;

  if (bytes > maxBytes) {
    return;
  }

  for (const [key, entry] of cache) {
    if (entry.expiresAt <= Date.now()) {
      removeCached(key);
    }
  }

  removeCached(path);

  while (cache.size >= maxEntries || cacheBytes + bytes > maxBytes) {
    const oldest = cache.keys().next().value;

    if (oldest === undefined) {
      break;
    }

    removeCached(oldest);
  }

  cache.set(path, {
    value,
    bytes,
    expiresAt: Date.now() + cacheTtl,
  });

  cacheBytes += bytes;
}

async function reserve(admin: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await admin.rpc("reserve_spotify_request");

  const budget = data?.[0];

  if (error || !budget) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  if (!budget.allowed) {
    throw new ApiError(429, "RATE_LIMITED", budget.retry_after_seconds);
  }
}

async function checkResponse(
  response: Response,
  admin: SupabaseClient<Database>,
): Promise<void> {
  if (response.status === 429) {
    const body: unknown = await response.json().catch(() => null);

    const parsed = z
      .object({
        error: z.object({
          reason: z.string().optional(),
        }),
      })
      .safeParse(body);

    const quota =
      parsed.success && parsed.data.error.reason === "QUOTA_EXCEEDED";

    const header = Number(response.headers.get("Retry-After"));

    const seconds =
      Number.isFinite(header) && header > 0
        ? Math.ceil(header)
        : quota
          ? 3600
          : 60;

    const { error } = await admin.rpc("block_spotify_requests", {
      p_seconds: Math.min(86400, seconds),
    });

    if (error) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    throw new ApiError(429, quota ? "SPOTIFY_QUOTA" : "RATE_LIMITED", seconds);
  }

  if (response.status === 404) {
    throw new ApiError(404, "ALBUM_NOT_FOUND");
  }

  if (!response.ok) {
    throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
  }
}

async function getToken(admin: SupabaseClient<Database>): Promise<string> {
  if (token && token.expiresAt > Date.now()) {
    return token.value;
  }

  if (tokenRequest) {
    return tokenRequest;
  }

  tokenRequest = (async () => {
    const id = Deno.env.get("SPOTIFY_CLIENT_ID");

    const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!id || !secret) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    await reserve(admin);

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(8000),
    });

    await checkResponse(response, admin);

    const result = tokenSchema.parse(await response.json());

    token = {
      value: result.access_token,
      expiresAt: Date.now() + Math.max(0, result.expires_in - 60) * 1000,
    };

    return token.value;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

async function fetchSpotifyJson(
  path: string,
  admin: SupabaseClient<Database>,
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const accessToken = await getToken(admin);

    await reserve(admin);

    const response = await fetch(`https://api.spotify.com/v1/${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 401 && attempt === 0) {
      token = null;
      continue;
    }

    await checkResponse(response, admin);

    return await response.json();
  }

  throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
}

export async function getSpotifyJson(
  path: string,
  admin: SupabaseClient<Database>,
): Promise<unknown> {
  const cacheable =
    /^albums\/[A-Za-z0-9]{22}(?:\/tracks)?\?/.test(path) ||
    (path.startsWith("search?") &&
      new URLSearchParams(path.slice(7)).get("type") === "artist");

  if (!cacheable) {
    return fetchSpotifyJson(path, admin);
  }

  const cached = readCached(path);

  if (cached) {
    return cached.value;
  }

  const existing = pending.get(path);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    const value = await fetchSpotifyJson(path, admin);

    storeCached(path, value);

    return value;
  })();

  const tracked = pending.size < 32;

  if (tracked) {
    pending.set(path, request);
  }

  try {
    return await request;
  } finally {
    if (tracked && pending.get(path) === request) {
      pending.delete(path);
    }
  }
}
