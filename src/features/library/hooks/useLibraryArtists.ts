import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { useLibraryView } from "@/features/library/hooks/useLibraryView";
import { getLibraryArtists } from "@/features/library/services/libraryArtistsService";

export function useLibraryArtists() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const view = useLibraryView();
  const requestedPage = view.artistPage;

  const query = useQuery({
    queryKey: [
      "musicPreferences",
      userId,
      "artist",
      "libraryPage",
      requestedPage,
    ],
    enabled: userId !== null,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return getLibraryArtists({
        userId,
        page: requestedPage,
        signal,
      });
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const total = query.data?.total ?? 0;
  const pageCount = Math.ceil(total / 10);
  const pageNumber = total === 0 ? 0 : (query.data?.page ?? requestedPage);

  return {
    items: query.data?.items ?? [],
    needsSignIn: userId === null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    metadataError: query.data?.metadataError ?? false,
    pageNumber,
    pageCount,
    hasPrevious: pageNumber > 1,
    hasNext: pageNumber > 0 && pageNumber < pageCount,

    onPrevious: () => {
      if (
        !query.isFetching &&
        pageNumber > 1 &&
        useAuthStore.getState().user?.id === userId
      ) {
        view.onChange({ artistPage: pageNumber - 1 });
      }
    },

    onNext: () => {
      if (
        !query.isFetching &&
        pageNumber > 0 &&
        pageNumber < pageCount &&
        useAuthStore.getState().user?.id === userId
      ) {
        view.onChange({ artistPage: pageNumber + 1 });
      }
    },

    onRetry: () => {
      if (
        userId &&
        !query.isFetching &&
        useAuthStore.getState().user?.id === userId
      ) {
        void query.refetch();
      }
    },
  };
}
