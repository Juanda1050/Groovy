import {
useInfiniteQuery,
useMutation,
useQueries,
useQueryClient,
} from "@tanstack/react-query";
import { useCallback,useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { albumLibraryKey,syncCatalogAlbumStatus } from "@/features/catalog/lib/albumQueries";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { saveCatalogAlbum,searchAlbums } from "@/features/catalog/services/spotifyService";
import { getCatalogRatings } from "@/features/library/services/libraryService";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import type { CatalogAlbum,CatalogRatings,ListeningStatus } from "@/models/catalog";

export function useAlbumSearch() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const saveLock = useRef(false);

  const query = (searchParams.get("q") ?? "").slice(0, 120);
  const normalized = query.trim().replace(/\s+/g, " ");
  const debounced = useDebouncedValue(normalized, 400);
  const isDebouncing = normalized !== debounced;
  const canSearch = normalized.length > 0;

  const enabled = userId !== null && canSearch && !isDebouncing;

  const search = useInfiniteQuery({
    queryKey: ["albumSearchInfinite", userId, debounced],
    enabled,
    initialPageParam: 0,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ pageParam, signal }) => {
      if (!userId || useAuthStore.getState().user?.id !== userId) {
        throw new CatalogError("UNAUTHORIZED");
      }

      const page = await client.fetchQuery({
        queryKey: ["albumSearch", userId, debounced, "scroll-chunk", pageParam],
        staleTime: 2 * 60_000,
        gcTime: 5 * 60_000,
        retry: false,
        queryFn: ({ signal: chunkSignal }) =>
          searchAlbums(
            debounced,
            pageParam,
            AbortSignal.any([signal, chunkSignal]),
            10,
          ),
      });

      signal.throwIfAborted();

      if (useAuthStore.getState().user?.id !== userId) {
        throw new CatalogError("UNAUTHORIZED");
      }

      return page;
    },
    getNextPageParam: (lastPage, pages) => {
      const next = lastPage.nextOffset;

      if (
        next === null ||
        lastPage.items.length === 0 ||
        next !== lastPage.offset + 10 ||
        next + 10 > 1000 ||
        pages.some((page) => page.offset === next)
      ) {
        return undefined;
      }

      return next;
    },
  });

  const pages = enabled ? (search.data?.pages ?? []) : [];

  const ratings = useQueries({
    queries: pages.map((page) => {
      const ids = [...new Set(page.items.map((album) => album.id))].sort();

      return {
        queryKey: ["catalogRatings", userId, ids],
        enabled: enabled && ids.length > 0,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        queryFn: ({ signal }: { signal: AbortSignal }) => {
          if (!userId) {
            throw new Error("AUTH_REQUIRED");
          }

          return getCatalogRatings(userId, ids, signal);
        },
      };
    }),
  });

  const save = useMutation({
    mutationFn: saveCatalogAlbum,
    retry: false,
    onMutate: async () => {
      await client.cancelQueries(
        {
          queryKey: ["albumSearchInfinite", userId],
        },
        { revert: false },
      );
    },
    onSuccess: (saved) => {
      if (useAuthStore.getState().user?.id !== userId) {
        return;
      }

      syncCatalogAlbumStatus(
        client,
        userId,
        saved.spotifyAlbumId,
        saved.status,
      );

      void client.invalidateQueries({
        queryKey: albumLibraryKey(userId, saved.spotifyAlbumId),
        refetchType: "none",
      });

      void client.invalidateQueries({
        queryKey: ["library", userId],
        refetchType: "none",
      });

      void client.invalidateQueries({
        queryKey: ["catalogRatings", userId],
        predicate: (entry) => {
          const ids = entry.queryKey[2];

          return Array.isArray(ids) && ids.includes(saved.spotifyAlbumId);
        },
      });
    },
    onSettled: () => {
      saveLock.current = false;
    },
  });

  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } =
    search;

  const onLoadMoreElement = useCallback(
    (element: HTMLDivElement | null) => {
      if (
        !element ||
        !enabled ||
        !hasNextPage ||
        isFetching ||
        isFetchNextPageError ||
        save.isPending
      ) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            void fetchNextPage({
              cancelRefetch: false,
            });
          }
        },
        { rootMargin: "240px 0px" },
      );

      observer.observe(element);

      return () => observer.disconnect();
    },
    [
      enabled,
      hasNextPage,
      isFetching,
      isFetchNextPageError,
      fetchNextPage,
      save.isPending,
    ],
  );

  const availableRatings: CatalogRatings = {};

  for (const result of ratings) {
    Object.assign(availableRatings, result.data ?? {});
  }

  const uniqueAlbums = new Map<string, CatalogAlbum>();

  for (const page of pages) {
    for (const album of page.items) {
      uniqueAlbums.set(album.id, album);
    }
  }

  const items = [...uniqueAlbums.values()].map((album) => ({
    ...album,
    libraryRating:
      album.libraryStatus === "listened"
        ? (availableRatings[album.id] ?? null)
        : null,
  }));

  const failure =
    save.error ??
    (enabled && !search.isFetchNextPageError ? search.error : null) ??
    ratings.find((result) => result.isError)?.error;

  const nextError =
    enabled && search.isFetchNextPageError ? search.error : null;

  return {
    query,
    items,
    canSearch,
    needsSignIn: userId === null,
    loading: userId !== null && canSearch && (isDebouncing || search.isPending),
    loadingMore: enabled && search.isFetchingNextPage,
    hasMore: enabled && search.hasNextPage,
    onLoadMoreElement,
    saving: save.isPending,
    savingAlbumId: save.isPending ? save.variables.albumId : null,
    savingStatus: save.isPending ? save.variables.status : null,
    errorCode:
      failure instanceof CatalogError
        ? failure.code
        : failure
          ? "SERVER_ERROR"
          : null,
    nextErrorCode:
      nextError instanceof CatalogError
        ? nextError.code
        : nextError
          ? "SERVER_ERROR"
          : null,
    onQueryChange: (value: string) => {
      const params = new URLSearchParams();

      if (value.trim()) {
        params.set("q", value.slice(0, 120));
      }

      setSearchParams(params, { replace: true });

      if (!saveLock.current) save.reset();
    },
    onSave: (albumId: string, status: ListeningStatus) => {
      if (!userId || saveLock.current) return;

      saveLock.current = true;
      save.mutate({ albumId, status });
    },
    onRetry: () => {
      if (search.isFetchNextPageError) {
        void search.fetchNextPage({
          cancelRefetch: false,
        });
      } else if (search.isError) {
        void search.refetch();
      } else {
        for (const result of ratings) {
          if (result.isError) {
            void result.refetch();
          }
        }
      }
    },
  };
}
