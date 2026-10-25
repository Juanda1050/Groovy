import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import type { CachedSpotifyToken } from "./models/spotify.ts";

let token: CachedSpotifyToken | null = null;
let tokenRequest: Promise<string> | null = null;

const tokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().positive(),
});

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
        ? Math.min(86400, Math.ceil(header))
        : quota
          ? 3600
          : 60;

    const { error } = await admin.rpc("block_spotify_requests", {
      p_seconds: seconds,
    });

    if (error) throw new ApiError(503, "SERVER_ERROR");

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

  if (tokenRequest) return tokenRequest;

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

export async function getSpotifyJson(
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
