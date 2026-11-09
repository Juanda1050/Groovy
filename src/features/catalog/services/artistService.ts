import { useAuthStore } from "@/features/auth/stores/authStore";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import {
  artistAlbumPageSchema,
  artistDetailSchema,
} from "@/features/catalog/lib/catalogSchemas";
import { invokeSpotify } from "@/features/catalog/services/spotifyService";
import type { ArtistAlbumPage, ArtistDetail } from "@/models/catalog";

function assertActive(userId: string, signal: AbortSignal): void {
  signal.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new CatalogError("UNAUTHORIZED");
  }
}

function validateArtistId(artistId: string): void {
  if (!/^[A-Za-z0-9]{22}$/.test(artistId)) {
    throw new CatalogError("INVALID_REQUEST");
  }
}

export async function getArtistDetail(
  userId: string,
  artistId: string,
  signal: AbortSignal,
): Promise<ArtistDetail> {
  assertActive(userId, signal);
  validateArtistId(artistId);

  const result = await invokeSpotify({ action: "artist", artistId }, signal);

  assertActive(userId, signal);

  const parsed = artistDetailSchema.safeParse(result);

  if (!parsed.success || parsed.data.id !== artistId) {
    throw new CatalogError("SERVER_ERROR");
  }

  return parsed.data;
}

export async function getArtistAlbums(
  userId: string,
  artistId: string,
  offset: number,
  signal: AbortSignal,
): Promise<ArtistAlbumPage> {
  assertActive(userId, signal);
  validateArtistId(artistId);

  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100_000 ||
    offset % 10 !== 0
  ) {
    throw new CatalogError("INVALID_REQUEST");
  }

  const result = await invokeSpotify(
    { action: "artistAlbums", artistId, offset },
    signal,
  );

  assertActive(userId, signal);

  const parsed = artistAlbumPageSchema.safeParse(result);

  if (
    !parsed.success ||
    parsed.data.offset !== offset ||
    (parsed.data.nextOffset !== null &&
      parsed.data.nextOffset !== offset + 10) ||
    new Set(parsed.data.items.map((album) => album.id)).size !==
      parsed.data.items.length
  ) {
    throw new CatalogError("SERVER_ERROR");
  }

  return parsed.data;
}
