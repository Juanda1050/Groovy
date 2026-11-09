import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getTrackMetadataBatch } from "../spotify/catalogMetadata.ts";
import { ApiError, readBody } from "../spotify/http.ts";
import type { Database } from "../spotify/models/database.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const market = (Deno.env.get("SPOTIFY_MARKET") ?? "MX").toUpperCase();

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const origins = new Set(
  (Deno.env.get("APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const idSchema = z.string().regex(/^[A-Za-z0-9]{22}$/);

const pageSchema = z.object({
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  page: z.number().int().positive(),
  items: z
    .array(
      z.object({
        id: idSchema,
        albumId: idSchema.nullable(),
        preference: z.object({
          user_id: z.uuid(),
          entity_type: z.literal("track"),
          spotify_id: idSchema,
          is_favorite: z.boolean(),
          sentiment: z.enum(["like", "dislike"]).nullable(),
          revision: z.number().int().nonnegative(),
          created_at: z.string(),
          updated_at: z.string(),
        }),
      }),
    )
    .max(10),
});

const requestSchema = z.object({
  filter: z.enum(["favorites", "likes", "dislikes"]),
  page: z.number().int().min(1).max(1_000_000),
});

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
    headers.set("Access-Control-Expose-Headers", "Retry-After");
  }

  const reply = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers });

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
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const identity = await userClient.auth.getClaims(authorization.slice(7));

    if (
      identity.error ||
      !identity.data ||
      identity.data.claims.role !== "authenticated"
    ) {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    const input = requestSchema.safeParse(await readBody(request));

    if (!input.success) {
      throw new ApiError(400, "INVALID_REQUEST");
    }

    const authorizationResult = await userClient.rpc(
      "authorize_spotify_action",
      { p_action: "detail" },
    );

    if (authorizationResult.error?.code === "PT401") {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    const budget = authorizationResult.data?.[0];

    if (authorizationResult.error || !budget) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    if (budget.user_id !== identity.data.claims.sub) {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    if (!budget.allowed) {
      throw new ApiError(429, "RATE_LIMITED", budget.retry_after_seconds);
    }

    const result = await userClient.rpc("get_my_song_library", {
      p_filter: input.data.filter,
      p_page: input.data.page,
    });

    if (result.error) {
      console.error("SONG_LIBRARY_DATABASE_FAILED", result.error.code);
      throw new ApiError(503, "SERVER_ERROR");
    }

    const parsed = pageSchema.safeParse(result.data);

    if (
      !parsed.success ||
      parsed.data.items.some(
        (item) =>
          item.preference.user_id !== budget.user_id ||
          item.preference.spotify_id !== item.id,
      )
    ) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    const page = parsed.data;
    const ids = page.items.map((item) => item.id);

    if (new Set(ids).size !== ids.length) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    const metadata = await getTrackMetadataBatch(ids, market, admin, 10);

    return reply({
      ...page,
      metadataError: metadata.metadataError,
      items: page.items.map((item) => ({
        ...item,
        metadata: metadata.items.get(item.id) ?? null,
      })),
    });
  } catch (error: unknown) {
    const failure =
      error instanceof ApiError ? error : new ApiError(503, "SERVER_ERROR");

    if (failure.retryAfter > 0) {
      headers.set("Retry-After", String(failure.retryAfter));
    }

    return reply(
      { error: failure.code, retryAfter: failure.retryAfter },
      failure.status,
    );
  }
});
