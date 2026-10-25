import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";

import { useState } from "react";

import { useAuthStore } from "@/features/auth/stores/authStore";

import {
  albumDetailOptions,
  albumGcTime,
  albumStaleTime,
} from "@/features/catalog/lib/albumQueries";

import { getAlbumTracks } from "@/features/catalog/services/spotifyService";
import { getLibraryTracks } from "@/features/library/services/trackPicksService";

import type { AlbumTracksPage } from "@/models/albumDetail";

import type {
  LibraryTrack,
  LibraryTrackMetadata,
  LibraryTrackView,
  TrackPreference,
} from "@/models/trackPicks";

async function loadTrackMetadata(
  client: QueryClient,
  userId: string,
  rows: readonly LibraryTrack[],
  signal: AbortSignal,
): Promise<Record<string, LibraryTrackMetadata>> {
  const result: Record<string, LibraryTrackMetadata> = {};
  const groups = new Map<string, Set<string>>();

  for (const row of rows) {
    const ids = groups.get(row.albumId) ?? new Set<string>();

    ids.add(row.trackId);
    groups.set(row.albumId, ids);
  }

  const entries = [...groups.entries()];
  let index = 0;
  let failed = false;

  async function worker(): Promise<void> {
    while (!failed && index < entries.length) {
      const entry = entries[index++];

      if (!entry) return;

      try {
        signal.throwIfAborted();

        const [albumId, requestedIds] = entry;
        const missing = new Set(requestedIds);

        const detail = await client.fetchQuery(
          albumDetailOptions(userId, albumId),
        );

        signal.throwIfAborted();

        function collect(page: AlbumTracksPage): void {
          for (const track of page.items) {
            if (!missing.has(track.id)) continue;

            const seconds = Math.floor(track.durationMs / 1000);

            result[`${albumId}:${track.id}`] = {
              albumName: detail.album.name,
              coverUrl: detail.album.coverUrl,

              track: {
                ...track,

                durationLabel:
                  `${Math.floor(seconds / 60)}:` +
                  String(seconds % 60).padStart(2, "0"),
              },
            };

            missing.delete(track.id);
          }
        }

        collect(detail.tracks);

        const progressive = client.getQueryData<InfiniteData<AlbumTracksPage>>([
          "albumTracksProgressive",
          userId,
          albumId,
        ]);

        const cachedPages = new Map(
          (progressive?.pages ?? []).map((page) => [page.offset, page]),
        );

        for (const page of cachedPages.values()) {
          collect(page);
        }

        let offset = detail.tracks.nextOffset;
        const visited = new Set<number>();

        while (missing.size > 0 && offset !== null && !visited.has(offset)) {
          signal.throwIfAborted();
          visited.add(offset);

          const currentOffset: number = offset;
          const cached = cachedPages.get(currentOffset);

          const page: AlbumTracksPage =
            cached ??
            (await client.fetchQuery({
              queryKey: ["albumTracksPage", userId, albumId, currentOffset],

              queryFn: ({ signal: pageSignal }) =>
                getAlbumTracks(albumId, currentOffset, pageSignal),

              staleTime: albumStaleTime,
              gcTime: albumGcTime,
              retry: false,
            }));

          signal.throwIfAborted();

          collect(page);
          offset = page.nextOffset;
        }
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }

  const completed = await Promise.allSettled([worker(), worker()]);

  for (const item of completed) {
    if (item.status === "rejected") {
      throw item.reason;
    }
  }

  return result;
}

export function useLibraryTracks(preference: TrackPreference, active: boolean) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const client = useQueryClient();
  const pageSize = 10;

  const [navigation, setNavigation] = useState({
    userId,
    preference,
    page: 1,
  });

  const requestedPage =
    navigation.userId === userId && navigation.preference === preference
      ? navigation.page
      : 1;

  const query = useQuery({
    queryKey: ["likedAlbums", userId, preference, requestedPage, pageSize],

    enabled: active && userId !== null,
    staleTime: 60_000,
    gcTime: 5 * 60_000,

    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error("AUTH_REQUIRED");
      }

      return getLibraryTracks({
        userId,
        preference,
        page: requestedPage,
        pageSize,
        signal,
      });
    },
  });

  const rows = query.data?.items ?? [];

  const identifiers = rows.map((row) => `${row.albumId}:${row.trackId}`).sort();

  const metadata = useQuery({
    queryKey: ["libraryTrackMetadata", userId, identifiers],

    enabled: active && userId !== null && rows.length > 0,

    staleTime: albumStaleTime,
    gcTime: albumGcTime,
    retry: false,

    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error("AUTH_REQUIRED");
      }

      return loadTrackMetadata(client, userId, rows, signal);
    },
  });

  const total = query.data?.total ?? 0;
  const pageCount = Math.ceil(total / pageSize);

  const pageNumber =
    total === 0 ? 0 : Math.min(query.data?.page ?? requestedPage, pageCount);

  const items: readonly LibraryTrackView[] = rows.map((row) => ({
    ...row,
    metadata: metadata.data?.[`${row.albumId}:${row.trackId}`] ?? null,
  }));

  const hasPrevious = pageNumber > 1;

  const hasNext = pageNumber > 0 && pageNumber < pageCount && rows.length > 0;

  function onPrevious(): void {
    if (query.isFetching || !hasPrevious) {
      return;
    }

    setNavigation({
      userId,
      preference,
      page: pageNumber - 1,
    });
  }

  function onNext(): void {
    if (query.isFetching || !hasNext) {
      return;
    }

    setNavigation({
      userId,
      preference,
      page: pageNumber + 1,
    });
  }

  return {
    items,
    total,
    pageSize,
    pageCount,
    pageNumber,

    metadataLoading: rows.length > 0 && metadata.isFetching,

    metadataError: metadata.isError,

    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,

    hasPrevious,
    hasNext,

    onPrevious,
    onNext,

    onFirst: () => {
      setNavigation({
        userId,
        preference,
        page: 1,
      });
    },

    onRetry: () => {
      if (query.isError) {
        void query.refetch();
      } else {
        void metadata.refetch();
      }
    },
  };
}
