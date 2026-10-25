import { useAuthStore } from "@/features/auth/stores/authStore";
import { getLibrary } from "@/features/library/services/libraryService";
import type { LibraryFilter,LibraryPageSize } from "@/models/libraryView";
import {
useQuery
} from "@tanstack/react-query";
import { useState } from "react";

export function isPageSize(value: number): value is LibraryPageSize {
  return value === 10 || value === 20 || value === 50;
}

export function useLibrary(active = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [pageSize, setPageSize] = useState<LibraryPageSize>(10);

  const [navigation, setNavigation] = useState({
    userId,
    page: 1,
  });

  const requestedPage = navigation.userId === userId ? navigation.page : 1;

  const query = useQuery({
    queryKey: ["library", userId, filter, requestedPage, pageSize],

    enabled: active && userId !== null,
    staleTime: 60_000,
    gcTime: 5 * 60_000,

    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

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

    setFilter(next);
    setNavigation({ userId, page: 1 });
  }

  function onPageSizeChange(next: number): void {
    if (!isPageSize(next) || next === pageSize || query.isFetching) {
      return;
    }

    setPageSize(next);
    setNavigation({ userId, page: 1 });
  }

  function onPrevious(): void {
    if (query.isFetching || !hasPrevious) return;

    setNavigation({
      userId,
      page: pageNumber - 1,
    });
  }

  function onNext(): void {
    if (query.isFetching || !hasNext) return;

    setNavigation({
      userId,
      page: pageNumber + 1,
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
    onPageSizeChange,
    onPrevious,
    onNext,

    onFirst: () => {
      setNavigation({ userId, page: 1 });
    },

    onRetry: () => {
      void query.refetch();
    },
  };
}
