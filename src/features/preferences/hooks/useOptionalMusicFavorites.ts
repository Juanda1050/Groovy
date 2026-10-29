import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { albumDetailOptions } from "@/features/catalog/lib/albumQueries";
import {
  getAlbumDetail,
  getAlbumTracks,
  searchAlbums,
} from "@/features/catalog/services/spotifyService";
import {
  mixArtistAlbums,
  orderBySeed,
} from "@/features/preferences/lib/albumSelection";
import type { AlbumDetail, AlbumTrack } from "@/models/albumDetail";
import type { CatalogAlbum } from "@/models/catalog";
import type { OptionalMusicFavoritesProps } from "@/models/musicOnboarding";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

type Album = AlbumDetail["album"];

interface FavoritesDraft {
  userId: string | null;
  albums: Album[];
  tracks: AlbumTrack[];
  knownAlbums: Album[];
}

interface ArtistAlbumGroup {
  id: string;
  items: CatalogAlbum[];
}

const ARTISTS_PER_BATCH = 3;

function toggleItem<T extends { id: string }>(
  items: readonly T[],
  item: T,
): T[] {
  if (items.some((current) => current.id === item.id)) {
    return items.filter((current) => current.id !== item.id);
  }

  return items.length < 100 ? [...items, item] : [...items];
}

export function useOptionalMusicFavorites({
  active,
  artists,
  saving,
  catalogBlocked,
  onCatalogError,
}: Pick<
  OptionalMusicFavoritesProps,
  "active" | "artists" | "saving" | "catalogBlocked" | "onCatalogError"
>) {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [shuffleSeed] = useState(() => crypto.randomUUID());

  const [search, setSearch] = useState("");
  const normalized = search.trim().replace(/\s+/g, " ");
  const debounced = useDebouncedValue(normalized, 400);
  const settling = normalized !== debounced;
  const searching = normalized.length > 0;

  const [page, setPage] = useState({ query: "", offset: 0 });
  const offset = page.query === debounced ? page.offset : 0;
  const [albumId, setAlbumId] = useState<string | null>(null);

  const [draft, setDraft] = useState<FavoritesDraft>({
    userId,
    albums: [],
    tracks: [],
    knownAlbums: [],
  });

  const owned = draft.userId === userId;
  const albums = owned ? draft.albums : [];
  const selectedTracks = owned ? draft.tracks : [];
  const knownAlbums = owned ? draft.knownAlbums : [];

  const enabled = active && Boolean(userId) && !saving;

  const sourceArtists = orderBySeed(
    [...new Map(artists.map((artist) => [artist.id, artist])).values()],
    `${shuffleSeed}:${userId ?? "anonymous"}`,
  );
  const sourceIds = sourceArtists.map((artist) => artist.id);

  function assertCurrent(signal?: AbortSignal): void {
    signal?.throwIfAborted();

    if (!userId || useAuthStore.getState().user?.id !== userId) {
      throw new Error("AUTH_REQUIRED");
    }
  }

  async function request<T>(
    signal: AbortSignal,
    load: () => Promise<T>,
  ): Promise<T> {
    assertCurrent(signal);

    try {
      const result = await load();
      assertCurrent(signal);
      return result;
    } catch (error: unknown) {
      if (!signal.aborted && useAuthStore.getState().user?.id === userId) {
        onCatalogError(error);
      }

      throw error;
    }
  }

  const suggestions = useInfiniteQuery({
    queryKey: [
      "onboardingAlbumSuggestions",
      userId,
      "mixedArtistBatches",
      sourceIds,
    ],
    enabled:
      enabled &&
      !searching &&
      albumId === null &&
      sourceArtists.length > 0 &&
      !catalogBlocked,
    initialPageParam: 0,

    queryFn: ({ pageParam, signal }) =>
      request(signal, async () => {
        const batch = sourceArtists.slice(
          pageParam,
          pageParam + ARTISTS_PER_BATCH,
        );

        if (batch.length === 0) {
          throw new Error("INVALID_ONBOARDING_SELECTION");
        }

        const groups: ArtistAlbumGroup[] = [];

        for (const artist of batch) {
          assertCurrent(signal);

          const artistName = artist.name
            .replace(/["\\]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const query = `artist:"${artistName.slice(0, 110)}"`;

          const result = await client.fetchQuery({
            queryKey: ["albumSearch", userId, query, "scroll-chunk", 0],
            staleTime: 2 * 60_000,
            gcTime: 5 * 60_000,
            retry: false,
            queryFn: ({ signal: cachedSignal }) =>
              searchAlbums(
                query,
                0,
                AbortSignal.any([signal, cachedSignal]),
                10,
              ),
          });

          assertCurrent(signal);

          groups.push({
            id: artist.id,
            items: result.items.filter((album) =>
              album.artists.some((item) => item.id === artist.id),
            ),
          });
        }

        return {
          nextArtistIndex: pageParam + batch.length,
          groups,
        };
      }),

    getNextPageParam: (last) =>
      last.nextArtistIndex < sourceArtists.length
        ? last.nextArtistIndex
        : undefined,

    maxPages: Math.max(1, Math.ceil(sourceArtists.length / ARTISTS_PER_BATCH)),
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const results = useQuery({
    queryKey: ["albumSearch", userId, debounced, "scroll-chunk", offset],
    enabled:
      enabled &&
      albumId === null &&
      debounced.length > 0 &&
      !settling &&
      !catalogBlocked,
    queryFn: ({ signal }) =>
      request(signal, () => searchAlbums(debounced, offset, signal, 10)),
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const detail = useQuery({
    ...albumDetailOptions(userId, albumId ?? ""),
    enabled: enabled && albumId !== null && !catalogBlocked,
    retry: false,
    queryFn: ({ signal }) =>
      request(signal, () => {
        if (!albumId) {
          throw new Error("INVALID_ONBOARDING_SELECTION");
        }

        return getAlbumDetail(albumId, signal);
      }),
  });

  const firstTracks = detail.data?.tracks;

  const tracks = useInfiniteQuery({
    queryKey: ["albumTracksProgressive", userId, albumId ?? ""],
    enabled:
      enabled &&
      albumId !== null &&
      firstTracks !== undefined &&
      !catalogBlocked,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      request(signal, async () => {
        if (pageParam === 0 && firstTracks) {
          return firstTracks;
        }

        if (!albumId) {
          throw new Error("INVALID_ONBOARDING_SELECTION");
        }

        return getAlbumTracks(albumId, pageParam, signal);
      }),
    getNextPageParam: (last, pages) => {
      const next = last.nextOffset;

      if (
        next === null ||
        next <= last.offset ||
        pages.some((item) => item.offset === next)
      ) {
        return undefined;
      }

      return next;
    },
    maxPages: 6,
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const suggestedAlbums = mixArtistAlbums(
    suggestions.data?.pages.flatMap((item) => item.groups) ?? [],
    `${shuffleSeed}:${userId ?? "anonymous"}`,
  );

  const availableTracks = [
    ...new Map(
      (
        tracks.data?.pages.flatMap((item) => item.items) ??
        firstTracks?.items ??
        []
      ).map((track) => [track.id, track]),
    ).values(),
  ];

  function canChange(): boolean {
    return (
      active &&
      !saving &&
      userId !== null &&
      useAuthStore.getState().user?.id === userId
    );
  }

  function ownedDraft(current: FavoritesDraft): FavoritesDraft {
    return current.userId === userId
      ? current
      : { userId, albums: [], tracks: [], knownAlbums: [] };
  }

  function toggleAlbum(album: Album): void {
    if (!canChange()) return;

    setDraft((current) => {
      const base = ownedDraft(current);
      return { ...base, albums: toggleItem(base.albums, album) };
    });
  }

  function toggleTrack(track: AlbumTrack): void {
    if (!canChange()) return;

    setDraft((current) => {
      const base = ownedDraft(current);
      return { ...base, tracks: toggleItem(base.tracks, track) };
    });
  }

  function toggleKnownAlbum(album: Album): void {
    if (!canChange()) return;

    setDraft((current) => {
      const base = ownedDraft(current);
      return {
        ...base,
        knownAlbums: toggleItem(base.knownAlbums, album),
      };
    });
  }

  const loading = albumId
    ? detail.isFetching || tracks.isFetching
    : searching
      ? settling || results.isFetching
      : suggestions.isFetching;

  const readError = albumId
    ? detail.isError || tracks.isError
    : searching
      ? !settling && results.isError
      : suggestions.isError;

  return {
    search,
    albums,
    selectedTracks,
    knownAlbums,
    albumId,
    album: detail.data?.album,
    items: searching
      ? !settling
        ? (results.data?.items ?? [])
        : []
      : suggestedAlbums,
    availableTracks,
    loading,
    readError,
    hasSearched: searching,
    previousOffset: Math.max(0, offset - 10),
    nextOffset: searching ? (results.data?.nextOffset ?? null) : null,
    offset,
    hasMoreTracks: Boolean(tracks.hasNextPage),
    hasMoreSuggestions: Boolean(suggestions.hasNextPage),
    toggleAlbum,
    toggleTrack,
    toggleKnownAlbum,

    favorites: {
      albumIds: albums.map((item) => item.id),
      trackIds: selectedTracks.map((item) => item.id),
      knownAlbumIds: knownAlbums.map((item) => item.id),
    },

    onSearch: (value: string) => {
      if (canChange()) {
        setAlbumId(null);
        setSearch(value.slice(0, 120));
      }
    },

    onOpenAlbum: (id: string) => {
      if (canChange()) setAlbumId(id);
    },

    onCloseAlbum: () => {
      if (canChange()) setAlbumId(null);
    },

    onPage: (nextOffset: number) => {
      if (canChange() && !loading && !catalogBlocked) {
        setPage({ query: debounced, offset: nextOffset });
      }
    },

    onMoreSuggestions: () => {
      if (
        canChange() &&
        !catalogBlocked &&
        !suggestions.isFetching &&
        suggestions.hasNextPage &&
        client.isFetching({
          queryKey: ["onboardingAlbumSuggestions", userId],
        }) === 0
      ) {
        void suggestions.fetchNextPage({ cancelRefetch: false });
      }
    },

    onMoreTracks: () => {
      if (canChange() && !loading && !catalogBlocked && tracks.hasNextPage) {
        void tracks.fetchNextPage({ cancelRefetch: false });
      }
    },

    onRetry: () => {
      if (!canChange() || loading || catalogBlocked) return;

      if (!albumId && !searching) {
        if (suggestions.isFetchNextPageError) {
          void suggestions.fetchNextPage({ cancelRefetch: false });
        } else {
          void suggestions.refetch();
        }
      } else if (!albumId) {
        void results.refetch();
      } else if (detail.isError) {
        void detail.refetch();
      } else if (tracks.isFetchNextPageError) {
        void tracks.fetchNextPage({ cancelRefetch: false });
      } else {
        void tracks.refetch();
      }
    },
  };
}
