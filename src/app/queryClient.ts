import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { MutationCache, QueryClient } from "@tanstack/react-query";

import i18n from "@/app/i18n";
import { useAuthStore } from "@/stores/authStore";

export const createToastManager = ToastPrimitive.createToastManager;
export const useToastManager = ToastPrimitive.useToastManager;

export const toast = createToastManager();

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, variables, _context, mutation) => {
      const key = mutation.options.mutationKey;
      const userId = useAuthStore.getState().user?.id ?? null;

      if (!userId || key?.[1] !== userId) return;

      const albumWrite = key[0] === "albumWrite";
      const profileWrite = key[0] === "profileWrite";

      if (!albumWrite && !profileWrite) return;

      toast.add({
        id: "groovy-save",
        type: "success",
        title: i18n.t("notifications.saved", {
          ns: "common",
        }),
        timeout: 2600,
        priority: "low",
      });

      if (albumWrite && typeof variables === "object" && variables !== null) {
        const changesSelections =
          !("action" in variables) || variables.action === "status";

        if (changesSelections) {
          void queryClient.invalidateQueries({
            queryKey: ["likedAlbums", userId],
            refetchType: "active",
          });
        }
      }
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
