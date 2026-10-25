import { queryOptions } from "@tanstack/react-query";
import { CatalogError } from "@/lib/catalogError";
import { getAlbumDetail } from "@/services/spotifyService";

export const albumStaleTime = 15 * 60_000;
export const albumGcTime = 30 * 60_000;

export function shouldRetryAlbum(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 2 || !(error instanceof CatalogError)) {
    return false;
  }

  if (error.code === "RATE_LIMITED" || error.code === "SPOTIFY_QUOTA") {
    return error.retryAfter > 0 && error.retryAfter <= 60;
  }

  return error.code === "SPOTIFY_UNAVAILABLE";
}

export function albumRetryDelay(attempt: number, error: unknown): number {
  if (
    error instanceof CatalogError &&
    (error.code === "RATE_LIMITED" || error.code === "SPOTIFY_QUOTA")
  ) {
    return Math.max(1, error.retryAfter) * 1000 + 300;
  }

  return Math.min(3000, 750 * 2 ** attempt);
}

export function albumDetailOptions(userId: string | null, albumId: string) {
  return queryOptions({
    queryKey: ["albumMetadata", userId, albumId],
    queryFn: ({ signal }) => getAlbumDetail(albumId, signal),
    staleTime: albumStaleTime,
    gcTime: albumGcTime,
    retry: shouldRetryAlbum,
    retryDelay: albumRetryDelay,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
