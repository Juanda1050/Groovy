import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { useLibraryView } from "@/features/library/hooks/useLibraryView";
import { getLibrary } from "@/features/library/services/libraryService";

import type { LibraryFilter } from "@/models/libraryView";

export function useLibrary(active = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const view = useLibraryView();

  const filter = view.filter;
  const pageSize = 10;
  const requestedPage = view.albumPage;

  const query = useQuery({
    queryKey: ["library", userId, filter, requestedPage, pageSize],
    enabled: active && userId !== null,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error("AUTH_REQUIRED");
      }

      return getLibrary({
        userId,
        filter,
        page: requestedPage,
        pageSize,
        signal,
      });
    },
  });

  const total = query.data?.total ?? 0;
  const pageCount = Math.ceil(total / pageSize);

  const pageNumber =
    total === 0 ? 0 : Math.min(query.data?.page ?? requestedPage, pageCount);

  const hasPrevious = pageNumber > 1;

  const hasNext =
    pageNumber > 0 &&
    pageNumber < pageCount &&
    (query.data?.items.length ?? 0) > 0;

  function onFilterChange(next: LibraryFilter): void {
    if (next === filter || query.isFetching) return;

    view.onChange({
      filter: next,
      albumPage: 1,
    });
  }

  function onPrevious(): void {
    if (query.isFetching || !hasPrevious) return;

    view.onChange({
      albumPage: pageNumber - 1,
    });
  }

  function onNext(): void {
    if (query.isFetching || !hasNext) return;

    view.onChange({
      albumPage: pageNumber + 1,
    });
  }

  return {
    filter,
    pageSize,
    pageCount,
    pageNumber,
    total,
    items: query.data?.items ?? [],

    needsSignIn: userId === null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,

    hasPrevious,
    hasNext,

    onFilterChange,
    onPrevious,
    onNext,

    onFirst: () => {
      view.onChange({
        albumPage: 1,
      });
    },

    onRetry: () => {
      void query.refetch();
    },
  };
}
