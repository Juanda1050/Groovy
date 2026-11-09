import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError, readBody } from "../spotify/http.ts";
import type { Database } from "../spotify/models/database.ts";
import { getAlbumRecommendation } from "./recommendationEngine.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const market = (Deno.env.get("SPOTIFY_MARKET") ?? "MX").toUpperCase();

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

const requestSchema = z.object({
  requestId: z.uuid(),
  strategy: z.enum(["personalized", "random"]).default("personalized"),
  supportsRatedAlbums: z.boolean().default(false),
  supportsTrackSources: z.boolean().default(false),
});

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  let userRateLimited = false;

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
    headers.set(
      "Access-Control-Expose-Headers",
      "Retry-After, X-Groovy-Rate-Limit",
    );
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
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
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
      { p_action: "search" },
    );

    if (authorizationResult.error?.code === "PT401") {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    const budget = authorizationResult.data?.[0];

    if (authorizationResult.error || !budget) {
      throw new ApiError(503, "SERVER_ERROR");
    }

    if (!budget.allowed) {
      userRateLimited = true;
      throw new ApiError(429, "RATE_LIMITED", budget.retry_after_seconds);
    }

    if (budget.user_id !== identity.data.claims.sub) {
      throw new ApiError(401, "UNAUTHORIZED");
    }

    return reply(
      await getAlbumRecommendation({
        userId: budget.user_id,
        requestId: input.data.requestId,
        strategy: input.data.strategy,
        supportsRatedAlbums: input.data.supportsRatedAlbums,
        supportsTrackSources: input.data.supportsTrackSources,
        market,
        signal: request.signal,
        userClient,
        admin,
      }),
    );
  } catch (error: unknown) {
    const failure =
      error instanceof ApiError ? error : new ApiError(503, "SERVER_ERROR");

    if (!(error instanceof ApiError)) {
      console.error(
        "ALBUM_RECOMMENDATION_UNEXPECTED_FAILURE",
        error instanceof Error ? error.name : "UnknownError",
      );
    }

    if (failure.retryAfter > 0) {
      headers.set("Retry-After", String(failure.retryAfter));
    }

    const rateLimitScope =
      failure.status === 429
        ? userRateLimited
          ? "user"
          : "shared"
        : undefined;

    if (rateLimitScope) {
      headers.set("X-Groovy-Rate-Limit", rateLimitScope);
    }

    return reply(
      {
        error: failure.code,
        retryAfter: failure.retryAfter,
        rateLimitScope,
      },
      failure.status,
    );
  }
});
