import { useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { CatalogError } from '@/lib/catalogError'
import {
  saveCatalogAlbum,
  searchAlbums,
} from '@/services/spotifyService'
import { useAuthStore } from '@/stores/authStore'
import { useDebouncedValue } from './useDebouncedValue'
import type {
  CatalogPage,
  ListeningStatus,
} from '@/models/catalog'

export function useAlbumSearch() {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const queryClient = useQueryClient()

  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)

  const normalized = query.trim().replace(/\s+/g, ' ')
  const debounced = useDebouncedValue(normalized, 400)
  const isDebouncing = normalized !== debounced
  const canSearch = normalized.length >= 3

  const search = useQuery({
    queryKey: ['albumSearch', userId, debounced, offset],
    enabled: userId !== null && canSearch && !isDebouncing,
    staleTime: 2 * 60_000,
    gcTime: 2 * 60_000,
    retry: false,
    queryFn: ({ signal }) =>
      searchAlbums(debounced, offset, signal),
  })

  const save = useMutation({
    mutationFn: saveCatalogAlbum,
    retry: false,
    onSuccess: (saved) => {
      if (useAuthStore.getState().user?.id !== userId) return

      queryClient.setQueriesData<CatalogPage>(
        { queryKey: ['albumSearch', userId] },
        (previous) => previous
          ? {
              ...previous,
              items: previous.items.map((album) =>
                album.id === saved.spotifyAlbumId
                  ? { ...album, libraryStatus: saved.status }
                  : album,
              ),
            }
          : previous,
      )

      void queryClient.invalidateQueries({
        queryKey: ['library', userId],
        refetchType: 'none',
      })
    },
  })

  function onQueryChange(value: string): void {
    setQuery(value)
    setOffset(0)
  }

  function onSave(
    albumId: string,
    status: ListeningStatus,
  ): void {
    if (!userId || save.isPending) return

    save.mutate({ albumId, status })
  }

  const failure = save.error ?? search.error

  return {
    query,
    onQueryChange,
    onSave,
    items: search.data?.items ?? [],
    needsSignIn: userId === null,
    canSearch,
    isDebouncing,
    loading: canSearch && (isDebouncing || search.isFetching),
    saving: save.isPending,
    savingAlbumId: save.isPending ? save.variables.albumId : null,
    savingStatus: save.isPending ? save.variables.status : null,
    errorCode: failure
      ? failure instanceof CatalogError
        ? failure.code
        : 'SERVER_ERROR'
      : null,
    pageNumber: Math.floor(offset / 10) + 1,
    hasPrevious: offset > 0,
    hasNext: search.data?.nextOffset !== null &&
      search.data?.nextOffset !== undefined,
    onPrevious: () => {
      if (!search.isFetching) {
        setOffset((current) => Math.max(0, current - 10))
      }
    },
    onNext: () => {
      const next = search.data?.nextOffset

      if (!search.isFetching && next !== null && next !== undefined) {
        setOffset(next)
      }
    },
  }
}