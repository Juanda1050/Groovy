import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CatalogError } from "@/lib/catalogError";
import { getCatalogRatings } from "@/services/catalogRatingsService";
import { saveCatalogAlbum, searchAlbums } from "@/services/spotifyService";
import { useAuthStore } from "@/stores/authStore";
import { useDebouncedValue } from "./useDebouncedValue";
import type { CatalogPage, ListeningStatus } from "@/models/catalog";

export function useAlbumSearch() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const saveLock = useRef(false);

  const query = (searchParams.get("q") ?? "").slice(0, 120);
  const requestedOffset = Number(searchParams.get("offset") ?? 0);

  const offset =
    Number.isInteger(requestedOffset) &&
    requestedOffset >= 0 &&
    requestedOffset <= 990 &&
    requestedOffset % 10 === 0
      ? requestedOffset
      : 0;

  const normalized = query.trim().replace(/\s+/g, " ");
  const debounced = useDebouncedValue(normalized, 400);
  const isDebouncing = normalized !== debounced;
  const canSearch = normalized.length >= 1;
  const enabled = userId !== null && canSearch && !isDebouncing;

  const search = useQuery({
    queryKey: ["albumSearch", userId, debounced, offset],
    enabled,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => searchAlbums(debounced, offset, signal),
  });

  const visibleData = enabled ? search.data : undefined;

  const albumIds = (visibleData?.items ?? [])
    .map((album) => album.id)
    .sort();

  const ratings = useQuery({
    queryKey: ["catalogRatings", userId, albumIds],
    enabled: enabled && albumIds.length > 0,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return getCatalogRatings(userId, albumIds, signal);
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const save = useMutation({
    mutationFn: saveCatalogAlbum,
    retry: false,
    onSuccess: (saved) => {
      if (useAuthStore.getState().user?.id !== userId) return;

      queryClient.setQueriesData<CatalogPage>(
        { queryKey: ["albumSearch", userId] },
        (previous) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((album) =>
                  album.id === saved.spotifyAlbumId
                    ? { ...album, libraryStatus: saved.status }
                    : album,
                ),
              }
            : previous,
      );

      void queryClient.invalidateQueries({
        queryKey: ["library", userId],
        refetchType: "none",
      });

      void queryClient.invalidateQueries({
        queryKey: ["catalogRatings", userId],
      });
    },
    onSettled: () => {
      saveLock.current = false;
    },
  });

  function updateSearch(value: string, nextOffset: number): void {
    const params = new URLSearchParams();

    if (value.trim()) {
      params.set("q", value.slice(0, 120));

      if (nextOffset > 0) {
        params.set("offset", String(nextOffset));
      }
    }

    setSearchParams(params, { replace: true });
  }

  function onQueryChange(value: string): void {
    updateSearch(value, 0);

    if (!saveLock.current) save.reset();
  }

  function onSave(albumId: string, status: ListeningStatus): void {
    if (!userId || saveLock.current) return;

    saveLock.current = true;
    save.mutate({ albumId, status });
  }

  const loading =
    userId !== null && canSearch && (isDebouncing || search.isFetching);

  const failure =
    save.error ??
    (enabled ? search.error : null) ??
    (enabled && albumIds.length > 0 ? ratings.error : null);

  const availableRatings =
    ratings.isSuccess && !ratings.isFetching ? ratings.data : undefined;

  const items = (visibleData?.items ?? []).map((album) => ({
    ...album,
    libraryRating:
      album.libraryStatus === "listened"
        ? (availableRatings?.[album.id] ?? null)
        : null,
  }));

  return {
    query,
    onQueryChange,
    onSave,
    items,
    needsSignIn: userId === null,
    canSearch,
    isDebouncing,
    loading,
    saving: save.isPending,
    savingAlbumId: save.isPending ? save.variables.albumId : null,
    savingStatus: save.isPending ? save.variables.status : null,
    errorCode: failure
      ? failure instanceof CatalogError
        ? failure.code
        : "SERVER_ERROR"
      : null,
    pageNumber: Math.floor(offset / 10) + 1,
    hasPrevious: offset > 0,
    hasNext: visibleData?.nextOffset != null,
    onPrevious: () => {
      if (!loading && offset > 0) {
        updateSearch(query, Math.max(0, offset - 10));
      }
    },
    onNext: () => {
      const next = visibleData?.nextOffset;

      if (!loading && next != null) {
        updateSearch(query, next);
      }
    },
  };
}