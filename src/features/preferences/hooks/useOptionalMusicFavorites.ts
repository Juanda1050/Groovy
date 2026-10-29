import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { albumDetailOptions } from "@/features/catalog/lib/albumQueries";
import {
  getAlbumDetail,
  getAlbumTracks,
  searchAlbums,
} from "@/features/catalog/services/spotifyService";
import type { AlbumDetail, AlbumTrack } from "@/models/albumDetail";
import type { OptionalMusicFavoritesProps } from "@/models/musicOnboarding";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

type Album = AlbumDetail["album"];

export function useOptionalMusicFavorites({
  active,
  saving,
  catalogBlocked,
  onCatalogError,
}: Pick<
  OptionalMusicFavoritesProps,
  "active" | "saving" | "catalogBlocked" | "onCatalogError"
>) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const [search, setSearch] = useState("");
  const normalized = search.trim().replace(/\s+/g, " ");
  const debounced = useDebouncedValue(normalized, 400);
  const settling = normalized !== debounced;

  const [page, setPage] = useState({ query: "", offset: 0 });
  const offset = page.query === debounced ? page.offset : 0;

  const [albumId, setAlbumId] = useState<string | null>(null);

  const [draft, setDraft] = useState<{
    userId: string | null;
    albums: Album[];
    tracks: AlbumTrack[];
    knownAlbums: Album[];
  }>({
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
      if (!signal.aborted) {
        onCatalogError(error);
      }

      throw error;
    }
  }

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

  function toggleAlbum(album: Album): void {
    if (!canChange()) {
      return;
    }

    setDraft((current) => {
      const base =
        current.userId === userId
          ? current
          : { userId, albums: [], tracks: [], knownAlbums: [] };

      const exists = base.albums.some((item) => item.id === album.id);

      return {
        ...base,
        albums: exists
          ? base.albums.filter((item) => item.id !== album.id)
          : base.albums.length < 100
            ? [...base.albums, album]
            : base.albums,
      };
    });
  }

  function toggleTrack(track: AlbumTrack): void {
    if (!canChange()) {
      return;
    }

    setDraft((current) => {
      const base =
        current.userId === userId
          ? current
          : { userId, albums: [], tracks: [], knownAlbums: [] };

      const exists = base.tracks.some((item) => item.id === track.id);

      return {
        ...base,
        tracks: exists
          ? base.tracks.filter((item) => item.id !== track.id)
          : base.tracks.length < 100
            ? [...base.tracks, track]
            : base.tracks,
      };
    });
  }

  function toggleKnownAlbum(album: Album): void {
    if (!canChange()) {
      return;
    }

    setDraft((current) => {
      const base =
        current.userId === userId
          ? current
          : { userId, albums: [], tracks: [], knownAlbums: [] };

      const exists = base.knownAlbums.some((item) => item.id === album.id);

      return {
        ...base,
        knownAlbums: exists
          ? base.knownAlbums.filter((item) => item.id !== album.id)
          : base.knownAlbums.length < 100
            ? [...base.knownAlbums, album]
            : base.knownAlbums,
      };
    });
  }

  const loading = albumId
    ? detail.isFetching || tracks.isFetching
    : settling || results.isFetching;

  const readError = albumId
    ? detail.isError || tracks.isError
    : !settling && results.isError;

  return {
    search,
    albums,
    selectedTracks,
    knownAlbums,
    albumId,
    album: detail.data?.album,
    items: !settling ? (results.data?.items ?? []) : [],
    availableTracks,
    loading,
    readError,
    hasSearched: normalized.length > 0,
    previousOffset: Math.max(0, offset - 10),
    nextOffset: results.data?.nextOffset ?? null,
    offset,
    hasMoreTracks: Boolean(tracks.hasNextPage),
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
        setSearch(value.slice(0, 120));
      }
    },

    onOpenAlbum: (id: string) => {
      if (canChange()) {
        setAlbumId(id);
      }
    },

    onCloseAlbum: () => {
      if (canChange()) {
        setAlbumId(null);
      }
    },

    onPage: (nextOffset: number) => {
      if (canChange() && !loading && !catalogBlocked) {
        setPage({ query: debounced, offset: nextOffset });
      }
    },

    onMoreTracks: () => {
      if (canChange() && !loading && !catalogBlocked && tracks.hasNextPage) {
        void tracks.fetchNextPage({ cancelRefetch: false });
      }
    },

    onRetry: () => {
      if (!canChange() || loading || catalogBlocked) {
        return;
      }

      if (!albumId) {
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
