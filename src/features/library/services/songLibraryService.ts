import { FunctionsHttpError } from "@supabase/supabase-js";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { catalogErrorSchema } from "@/features/catalog/lib/catalogSchemas";
import { songLibrarySchema } from "@/features/library/lib/songLibrarySchemas";
import type { SongFilter, SongLibraryPage } from "@/models/songLibrary";
import { supabase } from "@/shared/lib/supabaseClient";

export async function getSongLibrary(
  userId: string,
  filter: SongFilter,
  page: number,
  signal: AbortSignal,
): Promise<SongLibraryPage> {
  function assertActive(): void {
    signal.throwIfAborted();

    if (useAuthStore.getState().user?.id !== userId) {
      throw new CatalogError("UNAUTHORIZED");
    }
  }

  assertActive();

  const result = await supabase.functions.invoke<unknown>("songLibrary", {
    body: { filter, page },
    signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
  });

  assertActive();

  if (result.error) {
    const response: unknown =
      result.error instanceof FunctionsHttpError ? result.error.context : null;

    const payload: unknown =
      response instanceof Response
        ? await response.json().catch(() => null)
        : null;

    assertActive();

    const parsed = catalogErrorSchema.safeParse(payload);

    throw new CatalogError(
      response instanceof Response && response.status === 401
        ? "UNAUTHORIZED"
        : parsed.success
          ? parsed.data.error
          : "SERVER_ERROR",
      parsed.success ? parsed.data.retryAfter : 0,
    );
  }

  const value = songLibrarySchema.parse(result.data);
  const expectedPage = Math.min(page, Math.max(1, Math.ceil(value.total / 10)));

  if (
    value.page !== expectedPage ||
    value.items.some(
      (item) =>
        item.preference.user_id !== userId ||
        item.preference.spotify_id !== item.id ||
        (item.metadata !== null && item.metadata.id !== item.id),
    ) ||
    new Set(value.items.map((item) => item.id)).size !== value.items.length
  ) {
    throw new Error("INVALID_SONG_LIBRARY_RESPONSE");
  }

  return value;
}
