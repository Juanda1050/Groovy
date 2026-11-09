import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { MutationCache, QueryClient } from "@tanstack/react-query";

import i18n from "@/app/i18n";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { syncProfileCache } from "@/features/profile/lib/profileCache";

export const createToastManager = ToastPrimitive.createToastManager;
export const useToastManager = ToastPrimitive.useToastManager;
export const toast = createToastManager();

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: async (data, variables, _context, mutation) => {
      const key = mutation.options.mutationKey;
      const userId = useAuthStore.getState().user?.id ?? null;

      if (!userId || key?.[1] !== userId) return;

      const albumWrite = key[0] === "albumWrite";
      const profileWrite = key[0] === "profileWrite";

      if (!albumWrite && !profileWrite) return;

      if (profileWrite) {
        await syncProfileCache(queryClient, userId, data);

        if (useAuthStore.getState().user?.id !== userId) return;
      }

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
          ? i18n.t("removal.saved", { ns: "rating" })
          : i18n.t("notifications.saved", { ns: "common" }),
        timeout: 2600,
        priority: "low",
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
