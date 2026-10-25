import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { CatalogError } from "@/lib/catalogError";
import {
  catalogErrorSchema,
  catalogPageSchema,
  savedCatalogAlbumSchema,
} from "@/lib/catalogSchemas";
import { signOut } from "./authService";
import type {
  CatalogPage,
  CatalogRequest,
  SaveCatalogAlbumInput,
  SavedCatalogAlbum,
} from "@/models/catalog";

async function invokeSpotify(
  body: CatalogRequest,
  signal?: AbortSignal,
): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke<unknown>("spotify", {
    body,
    ...(signal ? { signal } : {}),
  });

  if (signal?.aborted) {
    throw new DOMException("Request aborted", "AbortError");
  }

  if (error instanceof FunctionsHttpError) {
    const response = error.context;

    if (response instanceof Response && response.status === 401) {
      await signOut();
      throw new CatalogError("UNAUTHORIZED");
    }

    const payload: unknown =
      response instanceof Response
        ? await response.json().catch(() => null)
        : null;

    const parsed = catalogErrorSchema.safeParse(payload);

    if (parsed.success) {
      throw new CatalogError(parsed.data.error, parsed.data.retryAfter);
    }

    throw new CatalogError("SERVER_ERROR");
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
): Promise<CatalogPage> {
  return catalogPageSchema.parse(
    await invokeSpotify({ action: "search", query, offset }, signal),
  );
}

export async function saveCatalogAlbum(
  input: SaveCatalogAlbumInput,
): Promise<SavedCatalogAlbum> {
  return savedCatalogAlbumSchema.parse(
    await invokeSpotify({ action: "save", ...input }),
  );
}
