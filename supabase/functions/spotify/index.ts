import { createClient } from "@supabase/supabase-js";
import { ApiError, readBody } from "./http.ts";
import { getSpotifyJson } from "./spotifyClient.ts";
import {
  catalogAlbumSchema,
  normalizeAlbum,
  requestSchema,
  searchSchema,
} from "./validation.ts";
import type { Database } from "./models/database.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient<Database>(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const origins = new Set(
  (Deno.env.get("APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const market = Deno.env.get("SPOTIFY_MARKET") ?? "MX";

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });

  if (origin && origins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set(
      "Access-Control-Allow-Headers",
      "authorization, apikey, content-type, x-client-info",
    );
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }

  function reply(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers });
  }

  try {
    if (origin && !origins.has(origin)) {
      throw new ApiError(403, "UNAUTHORIZED");
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      throw new ApiError(405, "INVALID_REQUEST");
    }

    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    const userClient = createClient<Database>(url, publicKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const jwt = authorization.slice(7);

    const { data: identity, error: identityError } =
      await userClient.auth.getClaims(jwt);

    if (
      identityError ||
      !identity ||
      identity.claims.role !== "authenticated"
    ) {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    const parsed = requestSchema.safeParse(await readBody(request));

    if (!parsed.success) {
      throw new ApiError(400, "INVALID_REQUEST");
    }

    const input = parsed.data;

    const { data: authorizationData, error: authorizationError } =
      await userClient.rpc("authorize_spotify_action", {
        p_action: input.action,
      });

    if (authorizationError?.code === "PT401") {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    const budget = authorizationData?.[0];

    if (authorizationError || !budget) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    if (!budget.allowed) {
      throw new ApiError(429, "RATE_LIMITED", budget.retry_after_seconds);
    }

    if (input.action === "search") {
      const parameters = new URLSearchParams({
        q: input.query,
        type: "album",
        market,
        limit: "10",
        offset: String(input.offset),
      });

      const raw = searchSchema.parse(
        await getSpotifyJson(`search?${parameters}`, admin),
      );

      const albums = raw.albums.items.map(normalizeAlbum);

      const { data: saved, error } =
        albums.length > 0
          ? await userClient
              .from("user_albums")
              .select("spotify_album_id, status")
              .eq("user_id", budget.user_id)
              .in(
                "spotify_album_id",
                albums.map((album) => album.id),
              )
          : { data: [], error: null };

      if (error) throw new ApiError(503, "SERVER_ERROR");

      return reply({
        items: albums.map((album) => {
          const existing = saved?.find(
            (item) => item.spotify_album_id === album.id,
          );

          return {
            ...album,
            libraryStatus: existing?.status ?? null,
          };
        }),
        nextOffset:
          raw.albums.next && input.offset + 10 <= 990
            ? input.offset + 10
            : null,
      });
    }

    const { data: existing, error: existingError } = await userClient
      .from("user_albums")
      .select("id, spotify_album_id, status")
      .eq("user_id", budget.user_id)
      .eq("spotify_album_id", input.albumId)
      .maybeSingle();

    if (existingError) throw new ApiError(503, "SERVER_ERROR");

    if (existing) {
      return reply({
        id: existing.id,
        spotifyAlbumId: existing.spotify_album_id,
        status: existing.status,
      });
    }

    const { data: cached, error: cacheError } = await admin
      .from("album_cache")
      .select("*")
      .eq("spotify_album_id", input.albumId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cacheError) throw new ApiError(503, "SERVER_ERROR");

    const cachedAlbum = catalogAlbumSchema.safeParse(
      cached
        ? {
            id: cached.spotify_album_id,
            name: cached.name,
            artists: cached.artists,
            coverUrl: cached.cover_url,
            releaseDate: cached.release_date,
            releaseDatePrecision: cached.release_date_precision,
            totalTracks: cached.total_tracks,
            spotifyUrl: `https://open.spotify.com/album/${cached.spotify_album_id}`,
          }
        : null,
    );

    const album = cachedAlbum.success
      ? cachedAlbum.data
      : normalizeAlbum(
          await getSpotifyJson(
            `albums/${input.albumId}?market=${market}`,
            admin,
          ),
        );

    if (!cachedAlbum.success) {
      const now = Date.now();

      const { error } = await admin.from("album_cache").upsert({
        spotify_album_id: album.id,
        name: album.name,
        artists: album.artists,
        cover_url: album.coverUrl,
        release_date: album.releaseDate,
        release_date_precision: album.releaseDatePrecision,
        total_tracks: album.totalTracks,
        fetched_at: new Date(now).toISOString(),
        expires_at: new Date(now + 6 * 60 * 60_000).toISOString(),
      });

      if (error) throw new ApiError(503, "SERVER_ERROR");
    }

    const { data: saved, error: saveError } = await userClient.rpc(
      "add_album_to_library",
      {
        p_spotify_album_id: album.id,
        p_status: input.status,
      },
    );

    if (saveError?.code === "PT401") {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    if (saveError?.message === "RATE_LIMITED") {
      throw new ApiError(429, "RATE_LIMITED", 60);
    }

    if (saveError || !saved) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    return reply({
      id: saved.id,
      spotifyAlbumId: saved.spotify_album_id,
      status: saved.status,
    });
  } catch (error: unknown) {
    const failure =
      error instanceof ApiError ? error : new ApiError(503, "SERVER_ERROR");

    if (failure.retryAfter > 0) {
      headers.set("Retry-After", String(failure.retryAfter));
    }

    return reply(
      {
        error: failure.code,
        retryAfter: failure.retryAfter,
      },
      failure.status,
    );
  }
});
