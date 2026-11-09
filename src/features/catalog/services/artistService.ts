import { useAuthStore } from "@/features/auth/stores/authStore";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { artistDetailSchema } from "@/features/catalog/lib/catalogSchemas";
import { invokeSpotify } from "@/features/catalog/services/spotifyService";
import type { ArtistDetail } from "@/models/catalog";

export async function getArtistDetail(
  userId: string,
  artistId: string,
  signal: AbortSignal,
): Promise<ArtistDetail> {
  function assertActive(): void {
    signal.throwIfAborted();

    if (useAuthStore.getState().user?.id !== userId) {
      throw new CatalogError("UNAUTHORIZED");
    }
  }

  assertActive();

  if (!/^[A-Za-z0-9]{22}$/.test(artistId)) {
    throw new CatalogError("INVALID_REQUEST");
  }

  const result = await invokeSpotify({ action: "artist", artistId }, signal);

  assertActive();

  const parsed = artistDetailSchema.safeParse(result);

  if (!parsed.success || parsed.data.id !== artistId) {
    throw new CatalogError("SERVER_ERROR");
  }

  return parsed.data;
}
