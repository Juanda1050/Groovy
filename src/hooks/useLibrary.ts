import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLibrary } from "@/services/libraryService";
import { useAuthStore } from "@/stores/authStore";
import type {
  LibraryFilter,
  LibraryLoadingDirection,
  LibraryNavigation,
} from "@/models/libraryView";

export function useLibrary() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [filter, setFilter] = useState<LibraryFilter>("all");

  const [direction, setDirection] = useState<LibraryLoadingDirection>(null);

  const [navigation, setNavigation] = useState<LibraryNavigation>({
    userId,
    cursors: [null],
  });

  const cursors = navigation.userId === userId ? navigation.cursors : [null];

  const cursor = cursors.at(-1) ?? null;

  const query = useQuery({
    queryKey: ["library", userId, filter, cursor],
    enabled: userId !== null,
    staleTime: 60_000,
    gcTime: 60_000,
    queryFn: ({ signal }) => getLibrary({ filter, cursor, signal }),
  });

  function onFilterChange(next: LibraryFilter): void {
    if (next === filter || query.isFetching) return;

    setDirection(null);
    setFilter(next);
    setNavigation({ userId, cursors: [null] });
  }

  function onNext(): void {
    const nextCursor = query.data?.nextCursor;

    if (!nextCursor || query.isFetching) return;

    setDirection("next");

    setNavigation((current) => {
      const currentLength =
        current.userId === userId ? current.cursors.length : 1;

      if (currentLength !== cursors.length) {
        return current;
      }

      return {
        userId,
        cursors: [...cursors, nextCursor],
      };
    });
  }

  function onPrevious(): void {
    if (cursors.length <= 1 || query.isFetching) return;

    setDirection("previous");
    setNavigation({
      userId,
      cursors: cursors.slice(0, -1),
    });
  }

  return {
    filter,
    onFilterChange,
    onNext,
    onPrevious,
    items: query.data?.items ?? [],
    pageNumber: cursors.length,
    hasPrevious: cursors.length > 1,
    hasNext: Boolean(query.data?.nextCursor),
    needsSignIn: userId === null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    loadingNext: query.isFetching && direction === "next",
    loadingPrevious: query.isFetching && direction === "previous",
    onRetry: () => {
      setDirection(null);
      void query.refetch();
    },
  };
}
