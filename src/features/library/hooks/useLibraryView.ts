import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/authStore";
import type { LibraryViewState } from "@/models/libraryView";

function initialView(): LibraryViewState {
  return {
    section: "albums",
    trackSection: "likes",
    filter: "all",
    artistPage: 1,
    albumPage: 1,
    likesPage: 1,
    dislikesPage: 1,
  };
}

export function useLibraryView() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();

  const key = ["libraryView", userId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: initialView,
    initialData: initialView,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  function onChange(changes: Partial<LibraryViewState>): void {
    if (useAuthStore.getState().user?.id !== userId) return;

    client.setQueryData<LibraryViewState>(key, (previous) => ({
      ...initialView(),
      ...previous,
      ...changes,
    }));
  }

  return {
    ...initialView(),
    ...query.data,
    onChange,
  };
}
