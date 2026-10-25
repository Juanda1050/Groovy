import { toast } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { syncAlbumLibrary } from "@/features/catalog/lib/albumQueries";
import { getCommunitySocial,setCommunityAction } from "@/features/community/services/communityService";
import { getLibraryErrorCode,getLibraryRetrySeconds } from "@/features/library/lib/libraryErrors";
import type { CommunityAction,CommunityPostState } from "@/models/library";
import type { ProfileSearchPage } from "@/models/profile";
import {
useIsMutating,
useMutation,
useQueries,
useQueryClient
} from "@tanstack/react-query";
import { useEffect,useState } from "react";
import { useTranslation } from "react-i18next";

export function useCommunitySocial(postIds: string[]) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const ids = [...new Set(postIds)].sort();
  const groups: string[][] = [];

  for (let offset = 0; offset < ids.length; offset += 40) {
    groups.push(ids.slice(offset, offset + 40));
  }

  const queries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["communitySocial", userId, group],
      enabled: Boolean(userId),
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        if (!userId) throw new Error("AUTH_REQUIRED");
        return getCommunitySocial(userId, group, signal);
      },
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: false,
      refetchOnWindowFocus: true,
    })),
  });

  return {
    byId: new Map(
      queries.flatMap((query) =>
        (query.data ?? []).map((row) => [row.post_id, row] as const),
      ),
    ),
    error: queries.some((query) => query.isError),
    onRetry: () => {
      for (const query of queries) void query.refetch();
    },
  };
}

export function useCommunityActions() {
  const { t } = useTranslation("community");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const key = ["communityWrite", userId];
  const writes = useIsMutating({ mutationKey: key });
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setRemainingSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  const mutation = useMutation({
    mutationKey: key,
    mutationFn: setCommunityAction,
    retry: false,

    onMutate: async (request) => {
      await Promise.all([
        client.cancelQueries({
          queryKey: ["communitySocial", request.userId],
        }),
        client.cancelQueries({
          queryKey: ["publicProfile", request.userId],
        }),
        request.action === "follow"
          ? client.cancelQueries({
              queryKey: ["profileSearch", request.userId],
            })
          : Promise.resolve(),
      ]);

      const previous = client.getQueriesData<CommunityPostState[]>({
        queryKey: ["communitySocial", request.userId],
      });

      if (
        request.action === "reaction" &&
        useAuthStore.getState().user?.id === request.userId
      ) {
        client.setQueriesData<CommunityPostState[]>(
          { queryKey: ["communitySocial", request.userId] },
          (rows) =>
            rows?.map((row) => {
              if (
                row.post_id !== request.targetId ||
                row.reacted === request.active
              ) {
                return row;
              }

              return {
                ...row,
                reacted: request.active,
                reaction_count: Math.max(
                  0,
                  row.reaction_count + (request.active ? 1 : -1),
                ),
              };
            }),
        );
      }

      const previousSearch =
        request.action === "follow"
          ? client.getQueriesData<ProfileSearchPage>({
              queryKey: ["profileSearch", request.userId],
            })
          : [];

      if (
        request.action === "follow" &&
        useAuthStore.getState().user?.id === request.userId
      ) {
        client.setQueriesData<ProfileSearchPage>(
          { queryKey: ["profileSearch", request.userId] },
          (page) =>
            page
              ? {
                  ...page,
                  items: page.items.map((item) =>
                    item.id === request.targetId
                      ? { ...item, following: request.active }
                      : item,
                  ),
                }
              : page,
        );
      }

      return { previous, previousSearch };
    },

    onSuccess: async (album, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      if (album) {
        syncAlbumLibrary(client, album);
        toast.add({
          type: "success",
          title: t("social.saved"),
          timeout: 2600,
        });
      }

      await Promise.all([
        client.invalidateQueries({
          queryKey: ["communitySocial", request.userId],
        }),
        client.invalidateQueries({
          queryKey: ["publicProfile", request.userId],
        }),
        request.action === "follow"
          ? client.invalidateQueries({
              queryKey: ["profileSearch", request.userId],
            })
          : Promise.resolve(),
      ]);
    },

    onError: (error, request, context) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      for (const [queryKey, data] of context?.previous ?? []) {
        client.setQueryData(queryKey, data);
      }

      for (const [queryKey, data] of context?.previousSearch ?? []) {
        client.setQueryData(queryKey, data);
      }

      if (request.action === "follow") {
        void client.invalidateQueries({
          queryKey: ["profileSearch", request.userId],
        });
      }

      const code = getLibraryErrorCode(error);
      const limited = code === "RATE_LIMITED";
      const seconds = limited ? getLibraryRetrySeconds(error) : 0;

      if (limited) setRemainingSeconds(seconds);

      const message = limited
        ? "social.rateError"
        : ["AUTH_REQUIRED", "SESSION_EXPIRED", "UNAUTHORIZED"].includes(code)
          ? "social.sessionError"
          : "social.error";

      toast.add({
        type: "error",
        title: t(message),
        timeout: 5000,
        ...(limited
          ? { description: t("social.retryAfter", { count: seconds }) }
          : {}),
      });

      void client.invalidateQueries({
        queryKey: ["communitySocial", request.userId],
      });
      void client.invalidateQueries({
        queryKey: ["publicProfile", request.userId],
      });
    },
  });

  const disabled = !userId || writes > 0 || remainingSeconds > 0;

  function onAction(
    action: CommunityAction["action"],
    targetId: string,
    active: boolean,
  ): void {
    if (
      disabled ||
      !userId ||
      useAuthStore.getState().user?.id !== userId ||
      client.isMutating({ mutationKey: key }) > 0
    ) {
      return;
    }

    mutation.mutate({ userId, action, targetId, active });
  }

  return { userId, disabled, onAction };
}
