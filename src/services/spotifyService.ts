import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";
import { CatalogError } from "@/lib/catalogError";
import {
  catalogErrorSchema,
  catalogPageSchema,
  savedCatalogAlbumSchema,
} from "@/lib/catalogSchemas";
import {
  albumDetailSchema,
  albumTracksPageSchema,
} from "@/lib/albumDetailSchemas";
import { useSpotifyNetworkStore } from "@/stores/spotifyNetworkStore";
import { signOut } from "./authService";

import type {
  CatalogPage,
  CatalogRequest,
  SaveCatalogAlbumInput,
  SavedCatalogAlbum,
  SpotifySearchPageSize,
} from "@/models/catalog";
import type { AlbumDetail, AlbumTracksPage } from "@/models/albumDetail";

async function invokeSpotify(
  body: CatalogRequest,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted();

  const network = useSpotifyNetworkStore.getState();
  const remaining = network.blockedUntil - Date.now();

  if (remaining > 0) {
    throw new CatalogError(network.limitCode, Math.ceil(remaining / 1000));
  }

  const timeout = AbortSignal.timeout(12_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const { data, error } = await supabase.functions.invoke<unknown>("spotify", {
    body,
    signal: requestSignal,
  });

  signal?.throwIfAborted();

  if (error instanceof FunctionsHttpError) {
    const response: unknown = error.context;

    if (response instanceof Response && response.status === 401) {
      await signOut();
      throw new CatalogError("UNAUTHORIZED");
    }

    const payload: unknown =
      response instanceof Response
        ? await response.json().catch(() => null)
        : null;

    const parsed = catalogErrorSchema.safeParse(payload);

    const header =
      response instanceof Response
        ? Number(response.headers.get("Retry-After"))
        : 0;

    const headerSeconds = Number.isFinite(header) ? Math.max(0, header) : 0;

    const code = parsed.success
      ? parsed.data.error
      : response instanceof Response && response.status === 429
        ? "RATE_LIMITED"
        : response instanceof Response && response.status >= 500
          ? "SPOTIFY_UNAVAILABLE"
          : "SERVER_ERROR";

    const retryAfter = Math.max(
      parsed.success ? parsed.data.retryAfter : 0,
      headerSeconds,
    );

    if (code === "RATE_LIMITED" || code === "SPOTIFY_QUOTA") {
      const seconds = retryAfter || 60;

      const userLimit =
        typeof payload === "object" &&
        payload !== null &&
        "rateLimitScope" in payload &&
        payload.rateLimitScope === "user";

      if (!userLimit) {
        useSpotifyNetworkStore.getState().block(seconds, code);
      }

      throw new CatalogError(code, seconds);
    }

    throw new CatalogError(code, retryAfter);
  }

  if (error) {
    throw new CatalogError("SPOTIFY_UNAVAILABLE");
  }

  return data;
}

export async function searchAlbums(
  query: string,
  offset: number,
  signal: AbortSignal,
  limit: SpotifySearchPageSize = 10,
): Promise<CatalogPage> {
  return catalogPageSchema.parse(
    await invokeSpotify({ action: "search", query, offset, limit }, signal),
  );
}

export async function saveCatalogAlbum(
  input: SaveCatalogAlbumInput,
): Promise<SavedCatalogAlbum> {
  return savedCatalogAlbumSchema.parse(
    await invokeSpotify({ action: "save", ...input }),
  );
}

export async function getAlbumDetail(
  albumId: string,
  signal: AbortSignal,
): Promise<AlbumDetail> {
  return albumDetailSchema.parse(
    await invokeSpotify({ action: "detail", albumId }, signal),
  );
}

export async function getAlbumTracks(
  albumId: string,
  offset: number,
  signal: AbortSignal,
): Promise<AlbumTracksPage> {
  return albumTracksPageSchema.parse(
    await invokeSpotify({ action: "tracks", albumId, offset }, signal),
  );
}
