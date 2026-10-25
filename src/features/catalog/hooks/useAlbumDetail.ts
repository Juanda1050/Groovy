import { useAuthStore } from "@/features/auth/stores/authStore";
import { albumDetailOptions,albumGcTime,albumRetryDelay,albumStaleTime,shouldRetryAlbum } from "@/features/catalog/lib/albumQueries";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { getAlbumTracks } from "@/features/catalog/services/spotifyService";
import { useSpotifyNetworkStore } from "@/features/catalog/stores/spotifyNetworkStore";
import type { AlbumDetail,AlbumTrackView } from "@/models/albumDetail";
import type { CatalogPage } from "@/models/catalog";
import {
useInfiniteQuery,
useQuery,
useQueryClient,
} from "@tanstack/react-query";
import { useEffect,useState } from "react";

export function useAlbumDetail(albumId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blockedUntil = useSpotifyNetworkStore((state) => state.blockedUntil);
  const blockedAt = useSpotifyNetworkStore((state) => state.blockedAt);
  const [now, setNow] = useState(Date.now);

  const validId = /^[A-Za-z0-9]{22}$/.test(albumId);
  const enabled = validId && userId !== null;

  useEffect(() => {
    if (blockedUntil <= Date.now()) return;

    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);

      if (current >= blockedUntil) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [blockedUntil]);

  const cachedAlbum = queryClient
    .getQueriesData<CatalogPage>({
      queryKey: ["albumSearch", userId],
    })
    .flatMap(([, page]) => page?.items ?? [])
    .find((album) => album.id === albumId);

  const preview: AlbumDetail["album"] | undefined = cachedAlbum
    ? {
        id: cachedAlbum.id,
        name: cachedAlbum.name,
        artists: cachedAlbum.artists,
        coverUrl: cachedAlbum.coverUrl,
        releaseDate: cachedAlbum.releaseDate,
        releaseDatePrecision: null,
        totalTracks: cachedAlbum.totalTracks,
        spotifyUrl: cachedAlbum.spotifyUrl,
      }
    : undefined;

  const detail = useQuery({
    ...albumDetailOptions(userId, albumId),
    enabled,
  });

  const initialPage = detail.data?.tracks;

  const tracks = useInfiniteQuery({
    queryKey: ["albumTracksProgressive", userId, albumId],
    enabled: enabled && initialPage !== undefined,
    initialPageParam: 0,
    staleTime: albumStaleTime,
    gcTime: albumGcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: shouldRetryAlbum,
    retryDelay: albumRetryDelay,
    queryFn: ({ pageParam, signal }) => {
      if (pageParam === 0) {
        if (!initialPage) {
          throw new Error("Album tracks unavailable");
        }

        return initialPage;
      }

      return getAlbumTracks(albumId, pageParam, signal);
    },
    getNextPageParam: (lastPage, pages) => {
      const next = lastPage.nextOffset;

      if (next === null) return undefined;

      if (
        next <= lastPage.offset ||
        pages.some((page) => page.offset === next)
      ) {
        return undefined;
      }

      return next;
    },
  });

  const { fetchNextPage, hasNextPage, isFetching, isError } = tracks;

  useEffect(() => {
    if (enabled && hasNextPage && !isFetching && !isError) {
      void fetchNextPage();
    }
  }, [enabled, fetchNextPage, hasNextPage, isFetching, isError]);

  const availableTracks = tracks.data
    ? tracks.data.pages.flatMap((page) => page.items)
    : (initialPage?.items ?? []);

  const trackViews: readonly AlbumTrackView[] = availableTracks.map((track) => {
    const seconds = Math.floor(track.durationMs / 1000);

    return {
      ...track,
      durationLabel:
        `${Math.floor(seconds / 60)}:` + String(seconds % 60).padStart(2, "0"),
    };
  });

  const album = detail.data?.album ?? preview;
  const failure = detail.error ?? tracks.error;

  const errorCode =
    failure instanceof CatalogError ? failure.code : "SERVER_ERROR";

  const waitingSeconds = Math.max(
    0,
    Math.ceil((blockedUntil - Math.max(now, blockedAt)) / 1000),
  );

  return {
    album: enabled ? album : undefined,
    tracks: enabled ? trackViews : [],
    invalidId: !validId,
    loading: enabled && !album && detail.isPending,
    error: detail.isError && !album,
    errorKey: `errors.${errorCode}`,
    retrying: detail.isFetching,
    waitingSeconds,
    tracksLoading:
      enabled && ((detail.isFetching && !detail.data) || tracks.isFetching),
    tracksError: detail.isError || tracks.isError,
    tracksErrorKey: `errors.${errorCode}`,
    retryingTracks: detail.isFetching || tracks.isFetching,
    onRetry: () => {
      void detail.refetch();
    },
    onRetryTracks: () => {
      if (!detail.data || detail.isError) {
        void detail.refetch();
      } else if (tracks.isFetchNextPageError) {
        void tracks.fetchNextPage();
      } else {
        void tracks.refetch();
      }
    },
  };
}
