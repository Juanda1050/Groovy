import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { MutationCache, QueryClient } from "@tanstack/react-query";

import i18n from "@/app/i18n";
import { useAuthStore } from "@/stores/authStore";

import type { TrackPick } from "@/models/trackPicks";

export const createToastManager = ToastPrimitive.createToastManager;

export const useToastManager = ToastPrimitive.useToastManager;

export const toast = createToastManager();

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: async (_data, variables, _context, mutation) => {
      const key = mutation.options.mutationKey;
      const userId = useAuthStore.getState().user?.id ?? null;

      if (!userId || key?.[1] !== userId) return;

      const albumWrite = key[0] === "albumWrite";
      const profileWrite = key[0] === "profileWrite";

      if (!albumWrite && !profileWrite) return;

      const deleting =
        albumWrite &&
        typeof variables === "object" &&
        variables !== null &&
        "action" in variables &&
        variables.action === "delete";

      toast.add({
        id: "groovy-save",
        type: "success",
        title: deleting
          ? i18n.t("removal.saved", {
              ns: "rating",
            })
          : i18n.t("notifications.saved", {
              ns: "common",
            }),
        timeout: 2600,
        priority: "low",
      });

      if (!albumWrite || typeof variables !== "object" || variables === null) {
        return;
      }

      const changesSelections =
        !("action" in variables) || variables.action === "status";

      if (!changesSelections) return;

      const changesStatus =
        "action" in variables && variables.action === "status";

      const albumId =
        "albumId" in variables && typeof variables.albumId === "string"
          ? variables.albumId
          : null;

      const picksKey = ["albumTrackPicks", userId, albumId];

      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ["likedAlbums", userId],
        }),

        changesStatus && albumId
          ? queryClient.cancelQueries({
              queryKey: picksKey,
            })
          : Promise.resolve(),
      ]);

      if (useAuthStore.getState().user?.id !== userId) {
        return;
      }

      if (changesStatus && albumId) {
        if ("status" in variables && variables.status === "pending") {
          queryClient.setQueriesData<TrackPick[]>(
            {
              queryKey: picksKey,
            },
            [],
          );
        }

        await queryClient.invalidateQueries({
          queryKey: picksKey,
          refetchType: "none",
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["likedAlbums", userId],
        refetchType: "active",
      });
    },
  }),

  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },

    mutations: {
      retry: false,
    },
  },
});
