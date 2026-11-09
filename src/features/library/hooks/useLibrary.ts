import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { useLibraryView } from "@/features/library/hooks/useLibraryView";
import { getLibraryAlbumCollection } from "@/features/library/services/libraryAlbumCollectionService";
import { getLibrary } from "@/features/library/services/libraryService";
import { useMusicPreferences } from "@/features/preferences/hooks/useMusicPreferences";
import type { LibraryFilter } from "@/models/libraryView";

export function useLibrary(active = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const view = useLibraryView();

  const filter = view.filter;
  const pageSize = 10;
  const requestedPage = view.albumPage;

  const query = useQuery({
    queryKey: [
      "library",
      userId,
      filter,
      requestedPage,
      pageSize,
      "albumCollectionV1",
    ],
    enabled: active && userId !== null,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      const input = {
        userId,
        filter,
        page: requestedPage,
        pageSize,
        signal,
      } as const;

      return filter === "all" || filter === "favorites"
        ? getLibraryAlbumCollection(input)
        : getLibrary(input);
    },
  });

  const items = query.data?.items ?? [];

  const preferences = useMusicPreferences(
    "album",
    active ? items.map((item) => item.spotifyAlbumId) : [],
  );

  const total = query.data?.total ?? 0;
  const pageCount = Math.ceil(total / pageSize);
  const pageNumber =
    total === 0 ? 0 : Math.min(query.data?.page ?? requestedPage, pageCount);

  const hasPrevious = pageNumber > 1;
  const hasNext = pageNumber > 0 && pageNumber < pageCount && items.length > 0;

  function canNavigate(): boolean {
    return (
      !query.isFetching &&
      !preferences.saving &&
      useAuthStore.getState().user?.id === userId
    );
  }

  function onFilterChange(next: LibraryFilter): void {
    if (next === filter || !canNavigate()) return;

    view.onChange({
      filter: next,
      albumPage: 1,
    });
  }

  function onPrevious(): void {
    if (!hasPrevious || !canNavigate()) return;
    view.onChange({ albumPage: pageNumber - 1 });
  }

  function onNext(): void {
    if (!hasNext || !canNavigate()) return;
    view.onChange({ albumPage: pageNumber + 1 });
  }

  return {
    filter,
    pageSize,
    pageCount,
    pageNumber,
    total,
    items,
    needsSignIn: userId === null,
    isPending: query.isPending,
    isFetching: query.isFetching || preferences.saving,
    isError: query.isError,
    hasPrevious,
    hasNext,
    preferences: preferences.preferences,
    preferenceError: preferences.readError,
    favoriteDisabled: preferences.disabled,
    onFilterChange,
    onPrevious,
    onNext,

    onFavoriteChange: (spotifyId: string, next: boolean) => {
      preferences.onChange(spotifyId, "favorite", next);
    },

    onPreferenceRetry: preferences.onRetry,

    onFirst: () => {
      if (canNavigate()) {
        view.onChange({ albumPage: 1 });
      }
    },

    onRetry: () => {
      if (useAuthStore.getState().user?.id === userId) {
        void query.refetch();
      }
    },
  };
}
