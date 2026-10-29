import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import type { ArtistCatalogPage } from "./models/artists.ts";

declare const EdgeRuntime: {
  waitUntil(task: Promise<unknown>): void;
};

const artistSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string().min(1),
  imageUrl: z.url().startsWith("https://"),
  imageWidth: z.number().int().min(96),
  imageHeight: z.number().int().min(96),
  spotifyUrl: z.url(),
  genres: z.array(z.string()).max(8).default([]),
  genreOffset: z
    .number()
    .int()
    .min(0)
    .max(990)
    .multipleOf(10)
    .nullable()
    .default(null),
});

const pageSchema = z.object({
  items: z.array(artistSchema).max(30),
  nextOffset: z.number().int().min(0).max(990).multipleOf(10).nullable(),
  nextBatch: z.number().int().min(1).max(5).nullable(),
});

const claimSchema = z.object({
  state: z.enum(["fresh", "refresh", "owner", "busy", "blocked"]),
  value: z.unknown(),
  leaseToken: z.uuid().nullable(),
  retryAfter: z.number().int().nonnegative(),
});

const pending = new Map<string, Promise<ArtistCatalogPage>>();

async function hashKey(identity: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function keepAlive(task: Promise<unknown>): void {
  const observed = task.catch((error: unknown) => {
    console.error(
      "ARTIST_CACHE_BACKGROUND_FAILED",
      error instanceof ApiError ? error.code : "SERVER_ERROR",
    );
  });

  if (typeof EdgeRuntime !== "undefined") {
    EdgeRuntime.waitUntil(observed);
  } else {
    void observed;
  }
}

async function buildAndStore(
  key: string,
  leaseToken: string,
  ttlSeconds: number,
  load: () => Promise<ArtistCatalogPage>,
  admin: SupabaseClient<Database>,
): Promise<ArtistCatalogPage> {
  try {
    const page = pageSchema.parse(await load());
    const payload = z.json().parse(page);

    const { data, error } = await admin.rpc("complete_artist_page_cache", {
      p_cache_key: key,
      p_lease_token: leaseToken,
      p_payload: payload,
      p_ttl_seconds: ttlSeconds,
    });

    if (error || data !== true) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    return page;
  } catch (error: unknown) {
    const failure =
      error instanceof ApiError ? error : new ApiError(503, "SERVER_ERROR");

    const retrySeconds =
      failure.status === 429
        ? Math.min(86400, Math.max(1, Math.ceil(failure.retryAfter || 60)))
        : 0;

    try {
      const { error: releaseError } = await admin.rpc(
        "fail_artist_page_cache",
        {
          p_cache_key: key,
          p_lease_token: leaseToken,
          p_retry_seconds: retrySeconds,
        },
      );

      if (releaseError) {
        console.error("ARTIST_CACHE_RELEASE_FAILED", releaseError.code);
      }
    } catch {
      console.error("ARTIST_CACHE_RELEASE_FAILED");
    }

    throw failure;
  }
}

async function resolvePage(
  key: string,
  ttlSeconds: number,
  load: () => Promise<ArtistCatalogPage>,
  admin: SupabaseClient<Database>,
): Promise<ArtistCatalogPage> {
  const delays = [200, 400, 800, 1600, 2500];

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    const { data, error } = await admin.rpc("claim_artist_page_cache", {
      p_cache_key: key,
    });

    if (error) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    const parsed = claimSchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    const claim = parsed.data;

    if (claim.state === "fresh" || claim.state === "refresh") {
      const page = pageSchema.safeParse(claim.value);

      if (!page.success) {
        throw new ApiError(503, "SERVER_ERROR");
      }

      if (claim.state === "refresh") {
        if (!claim.leaseToken) {
          throw new ApiError(503, "SERVER_ERROR");
        }

        keepAlive(
          buildAndStore(key, claim.leaseToken, ttlSeconds, load, admin),
        );
      }

      return page.data;
    }

    if (claim.state === "blocked") {
      throw new ApiError(429, "RATE_LIMITED", Math.max(1, claim.retryAfter));
    }

    if (claim.state === "owner") {
      if (!claim.leaseToken) {
        throw new ApiError(503, "SERVER_ERROR");
      }

      const task = buildAndStore(
        key,
        claim.leaseToken,
        ttlSeconds,
        load,
        admin,
      );

      keepAlive(task);

      return await task;
    }

    const delay = delays[attempt];

    if (delay === undefined) {
      break;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  throw new ApiError(503, "SERVER_ERROR");
}

export async function getSharedArtistPage(
  identity: string,
  ttlSeconds: number,
  load: () => Promise<ArtistCatalogPage>,
  admin: SupabaseClient<Database>,
): Promise<ArtistCatalogPage> {
  const key = await hashKey(identity);

  const existing = pending.get(key);

  if (existing) {
    return existing;
  }

  const task = resolvePage(key, ttlSeconds, load, admin);

  const tracked = pending.size < 32;

  if (tracked) {
    pending.set(key, task);
  }

  try {
    return await task;
  } finally {
    if (tracked && pending.get(key) === task) {
      pending.delete(key);
    }
  }
}
