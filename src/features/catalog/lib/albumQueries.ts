import {
queryOptions,
type InfiniteData,
type QueryClient,
} from "@tanstack/react-query";

import { CatalogError } from "@/features/catalog/lib/catalogError";
import { getAlbumDetail } from "@/features/catalog/services/spotifyService";
import { getUserAlbum } from "@/features/library/services/libraryService";

import type { CatalogPage,CatalogRatings,ListeningStatus } from "@/models/catalog";
import type { LibraryAlbum } from "@/models/library";
import type { LibraryPageResult } from "@/models/libraryView";
import type { LibraryTracksPage,TrackPick } from "@/models/trackPicks";

export const albumStaleTime = 15 * 60_000;
export const albumGcTime = 30 * 60_000;

export function albumLibraryKey(userId: string | null, albumId: string) {
  return ["userAlbum", userId, albumId] as const;
}

export function albumWriteKey(userId: string | null, albumId: string) {
  return ["albumWrite", userId, albumId] as const;
}

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

export function albumLibraryOptions(userId: string | null, albumId: string) {
  return queryOptions({
    queryKey: albumLibraryKey(userId, albumId),
    enabled: userId !== null && /^[A-Za-z0-9]{22}$/.test(albumId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return getUserAlbum(userId, albumId, signal);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function syncCatalogAlbumStatus(
  queryClient: QueryClient,
  userId: string | null,
  albumId: string,
  status: ListeningStatus | null,
): void {
  void queryClient.cancelQueries(
    { queryKey: ["albumSearchInfinite", userId] },
    { revert: false },
  );

  function updatePage(page: CatalogPage): CatalogPage {
    return {
      ...page,
      items: page.items.map((item) =>
        item.id === albumId ? { ...item, libraryStatus: status } : item,
      ),
    };
  }

  queryClient.setQueriesData<CatalogPage>(
    { queryKey: ["albumSearch", userId] },
    (previous) => (previous ? updatePage(previous) : previous),
  );

  queryClient.setQueriesData<InfiniteData<CatalogPage, number>>(
    { queryKey: ["albumSearchInfinite", userId] },
    (previous) =>
      previous
        ? {
            ...previous,
            pages: previous.pages.map(updatePage),
          }
        : previous,
  );
}

export function syncAlbumLibrary(
  queryClient: QueryClient,
  album: LibraryAlbum,
): void {
  const userId = album.user_id;
  const albumId = album.spotify_album_id;

  queryClient.setQueryData<LibraryAlbum | null>(
    albumLibraryKey(userId, albumId),
    album,
  );

  syncCatalogAlbumStatus(queryClient, userId, albumId, album.status);

  queryClient.setQueriesData<CatalogRatings>(
    { queryKey: ["catalogRatings", userId] },
    (previous) =>
      previous && albumId in previous
        ? { ...previous, [albumId]: album.rating }
        : previous,
  );

  queryClient.setQueriesData<LibraryPageResult>(
    { queryKey: ["library", userId] },
    (previous) =>
      previous
        ? {
            ...previous,
            items: previous.items.map((item) =>
              item.spotifyAlbumId === albumId
                ? {
                    ...item,
                    status: album.status,
                    rating: album.rating,
                    hasReview: Boolean(album.review?.trim()),
                  }
                : item,
            ),
          }
        : previous,
  );

  void queryClient.invalidateQueries({
    queryKey: ["library", userId],
  });
  void queryClient.invalidateQueries({
    queryKey: ["albumFeed"],
  });
}

export function syncAlbumRemoval(
  client: QueryClient,
  userId: string,
  albumId: string,
): void {
  const album = client.getQueryData<LibraryAlbum | null>(
    albumLibraryKey(userId, albumId),
  );

  client.setQueryData<LibraryAlbum | null>(
    albumLibraryKey(userId, albumId),
    null,
  );

  syncCatalogAlbumStatus(client, userId, albumId, null);

  client.setQueriesData<CatalogRatings>(
    { queryKey: ["catalogRatings", userId] },
    (previous) =>
      previous && albumId in previous
        ? { ...previous, [albumId]: null }
        : previous,
  );

  client.setQueriesData<TrackPick[]>(
    {
      queryKey: ["albumTrackPicks", userId, albumId],
    },
    [],
  );

  client.setQueriesData({ queryKey: ["albumPost", userId, albumId] }, null);

  void client.invalidateQueries({ queryKey: ["albumFeed"] });

  const libraryEntries = client.getQueriesData<LibraryPageResult>({
    queryKey: ["library", userId],
  });

  for (const [key, previous] of libraryEntries) {
    if (!previous) continue;

    const filter = key[2];

    const included =
      album &&
      (filter === "all" ||
        filter === album.status ||
        (filter === "rated" && album.rating !== null) ||
        (filter === "unrated" &&
          album.status === "listened" &&
          album.rating === null) ||
        (filter === "reviewed" && Boolean(album.review?.trim())));

    const items = previous.items.filter(
      (item) => item.spotifyAlbumId !== albumId,
    );

    const removed = included || items.length < previous.items.length;

    client.setQueryData<LibraryPageResult>(key, {
      ...previous,
      items,
      total: Math.max(0, previous.total - (removed ? 1 : 0)),
    });
  }

  client.setQueriesData<LibraryTracksPage>(
    { queryKey: ["likedAlbums", userId] },
    (previous) => {
      if (!previous) return previous;

      const items = previous.items.filter((item) => item.albumId !== albumId);

      return {
        ...previous,
        items,
        total: Math.max(
          0,
          previous.total - (previous.items.length - items.length),
        ),
      };
    },
  );

  void client.invalidateQueries({
    queryKey: ["library", userId],
  });

  void client.invalidateQueries({
    queryKey: ["likedAlbums", userId],
  });
}
