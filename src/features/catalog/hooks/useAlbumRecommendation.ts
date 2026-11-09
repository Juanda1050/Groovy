import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import { toast } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { syncAlbumLibrary } from "@/features/catalog/lib/albumQueries";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { catalogErrorCodeSchema } from "@/features/catalog/lib/catalogSchemas";
import {
  fetchAlbumRecommendation,
  getKnownAlbumRevision,
  recordRecommendationEvent,
  saveRecommendedAlbum,
  setRecommendedAlbumKnown,
} from "@/features/catalog/services/recommendationService";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/features/library/lib/libraryErrors";
import type {
  KnownAlbumChange,
  KnownAlbumChangeResult,
  KnownAlbumIntent,
  RecommendationAction,
  RecommendationImpression,
  RecommendationResult,
} from "@/models/albumRecommendation";

function getErrorCode(error: unknown): string | null {
  if (!error) return null;

  const code = getLibraryErrorCode(error);

  if (
    code === "AUTH_REQUIRED" ||
    code === "SESSION_EXPIRED" ||
    code === "UNAUTHORIZED"
  ) {
    return "UNAUTHORIZED";
  }

  if (code === "KNOWN_ALBUM_CONFLICT") return code;

  const parsed = catalogErrorCodeSchema.safeParse(code);

  return parsed.success ? parsed.data : "SERVER_ERROR";
}

export function useAlbumRecommendation() {
  const { t } = useTranslation(["discover", "common"]);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const mounted = useRef(false);
  const [releasedLimit, setReleasedLimit] = useState(0);

  const parsedId = z.uuid().safeParse(params.get("rec"));
  const requestId = parsedId.success ? parsedId.data : null;
  const queryKey = ["albumRecommendation", userId, requestId];
  const writeKey = ["recommendationAction", userId];
  const writes = useIsMutating({ mutationKey: writeKey });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    client.removeQueries({
      queryKey: ["albumRecommendation", userId],
      type: "inactive",
    });
  }, [client, userId, requestId]);

  function begin(): void {
    if (!userId || useAuthStore.getState().user?.id !== userId) return;

    const nextId = crypto.randomUUID();

    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("catalog", "forYou");
      next.set("rec", nextId);
      return next;
    });
  }

  function advanceFrom(ownerId: string, previousRequestId: string): void {
    if (
      !mounted.current ||
      useAuthStore.getState().user?.id !== ownerId ||
      window.location.pathname !== "/"
    ) {
      return;
    }

    const current = new URLSearchParams(window.location.search);

    if (
      current.get("catalog") === "forYou" &&
      current.get("rec") === previousRequestId
    ) {
      begin();
    }
  }

  const query = useQuery<RecommendationResult>({
    queryKey,
    enabled: Boolean(userId && requestId),
    queryFn: ({ signal }) => {
      if (!userId || !requestId) {
        throw new CatalogError("UNAUTHORIZED");
      }

      return fetchAlbumRecommendation(
        userId,
        { requestId, strategy: "personalized" },
        signal,
      );
    },
    staleTime: 0,
    gcTime: 15 * 60_000,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const action = useMutation({
    mutationKey: writeKey,
    retry: false,

    mutationFn: async (request: RecommendationAction) => {
      if (request.kind === "save") {
        return saveRecommendedAlbum(request.userId, request.recommendation);
      }

      await recordRecommendationEvent(
        request.userId,
        request.recommendation,
        request.kind,
      );

      return null;
    },

    onMutate: (request) =>
      client.cancelQueries({
        queryKey: ["albumRecommendation", request.userId, request.requestId],
        exact: true,
      }),

    onSuccess: (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      const targetKey = [
        "albumRecommendation",
        request.userId,
        request.requestId,
      ];

      if (saved) {
        syncAlbumLibrary(client, saved);

        client.setQueryData<RecommendationResult>(
          targetKey,
          (): RecommendationResult => ({
            state: "empty",
            reason: "saved",
          }),
        );

        toast.add({
          type: "success",
          title: t("notifications.saved", { ns: "common" }),
          timeout: 2600,
        });

        return;
      }

      if (request.kind !== "another" && request.kind !== "not_interested") {
        return;
      }

      client.setQueryData<RecommendationResult>(
        targetKey,
        (): RecommendationResult => ({
          state: "empty",
          reason: "selection_changed",
        }),
      );

      advanceFrom(request.userId, request.requestId);
    },
  });

  const known = useMutation<KnownAlbumChangeResult, unknown, KnownAlbumChange>({
    mutationKey: writeKey,
    mutationFn: setRecommendedAlbumKnown,
    retry: false,

    onMutate: (request) =>
      client.cancelQueries({
        queryKey: ["albumRecommendation", request.userId, request.requestId],
        exact: true,
      }),

    onSuccess: async (result, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      if (!request.active) {
        toast.add({
          type: "success",
          title: t("recommendations.knownUndone"),
          timeout: 2600,
        });

        return;
      }

      const targetKey = [
        "albumRecommendation",
        request.userId,
        request.requestId,
      ];

      await client.cancelQueries({
        queryKey: targetKey,
        exact: true,
      });

      if (useAuthStore.getState().user?.id !== request.userId) return;

      client.setQueryData<RecommendationResult>(
        targetKey,
        (): RecommendationResult => ({
          state: "empty",
          reason: "known",
        }),
      );

      showKnownToast(result, request);
      advanceFrom(request.userId, request.requestId);
    },
  });

  function showKnownToast(
    result: KnownAlbumChangeResult,
    request: KnownAlbumChange,
  ): void {
    const toastId = `known-album-${request.recommendation.id}`;

    const canUndo =
      result.changed &&
      result.knownAlbum.source_recommendation_id === request.recommendation.id;

    toast.add({
      id: toastId,
      type: "success",
      title: t("recommendations.knownSaved"),
      timeout: 7000,
      ...(canUndo
        ? {
            actionProps: {
              children: t("recommendations.undo"),
              onClick: () => {
                if (
                  useAuthStore.getState().user?.id !== request.userId ||
                  client.isMutating({
                    mutationKey: ["recommendationAction", request.userId],
                  }) > 0
                ) {
                  return;
                }

                known.mutate({
                  ...request,
                  active: false,
                  expectedRevision: result.knownAlbum.revision,
                });

                toast.close(toastId);
              },
            },
          }
        : {}),
    });
  }

  const prepareKnown = useMutation<number, unknown, KnownAlbumIntent>({
    mutationKey: writeKey,
    mutationFn: getKnownAlbumRevision,
    retry: false,

    onSuccess: (revision, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      known.mutate({
        ...request,
        active: true,
        expectedRevision: revision,
      });
    },
  });

  const impression = useMutation({
    mutationKey: ["recommendationImpression", userId],
    retry: false,

    mutationFn: (request: RecommendationImpression) =>
      recordRecommendationEvent(
        request.userId,
        request.recommendation,
        "impression",
      ),

    onError: (error) => {
      console.error(
        "RECOMMENDATION_IMPRESSION_FAILED",
        error instanceof CatalogError ? error.code : "SERVER_ERROR",
      );
    },
  });

  const knownError =
    known.variables &&
    (!known.variables.active || known.variables.requestId === requestId)
      ? known.error
      : null;

  const preparationError =
    prepareKnown.variables?.requestId === requestId ? prepareKnown.error : null;

  const actionError =
    action.variables?.requestId === requestId ? action.error : null;

  const error = knownError ?? preparationError ?? actionError ?? query.error;

  const errorStartedAt = knownError
    ? known.submittedAt
    : preparationError
      ? prepareKnown.submittedAt
      : actionError
        ? action.submittedAt
        : query.errorUpdatedAt;

  const errorCode = getErrorCode(error);
  const limited = errorCode === "RATE_LIMITED" || errorCode === "SPOTIFY_QUOTA";

  const retryAfter = limited ? getLibraryRetrySeconds(error) : 0;
  const waiting = limited && releasedLimit !== errorStartedAt;

  useEffect(() => {
    if (!waiting) return;

    const timer = window.setTimeout(() => {
      setReleasedLimit(errorStartedAt);
    }, retryAfter * 1000);

    return () => window.clearTimeout(timer);
  }, [waiting, errorStartedAt, retryAfter]);

  const recommendation =
    query.data?.state === "ready" ? query.data.recommendation : null;

  const busy = query.isFetching || writes > 0 || waiting;

  function canAct(): boolean {
    return Boolean(
      userId &&
      requestId &&
      recommendation &&
      !busy &&
      useAuthStore.getState().user?.id === userId &&
      client.isMutating({ mutationKey: writeKey }) === 0,
    );
  }

  function perform(kind: RecommendationAction["kind"]): void {
    if (!canAct() || !userId || !requestId || !recommendation) return;

    action.mutate({
      userId,
      requestId,
      recommendation,
      kind,
    });
  }

  function markKnown(): void {
    if (!canAct() || !userId || !requestId || !recommendation) return;

    prepareKnown.mutate({
      userId,
      requestId,
      recommendation,
    });
  }

  function next(): void {
    if (busy) return;

    if (recommendation) perform("another");
    else begin();
  }

  function retry(): void {
    if (busy || !userId) return;

    if (knownError && known.variables) {
      if (getLibraryErrorCode(knownError) === "KNOWN_ALBUM_CONFLICT") {
        known.reset();
        prepareKnown.reset();
        void query.refetch();
        return;
      }

      known.mutate(known.variables);
      return;
    }

    if (preparationError && prepareKnown.variables) {
      prepareKnown.mutate(prepareKnown.variables);
      return;
    }

    if (actionError && action.variables) {
      action.mutate(action.variables);
      return;
    }

    if (requestId) void query.refetch();
    else begin();
  }

  return {
    userId,
    requestId,
    response: query.data,
    recommendation,
    loading: Boolean(requestId) && query.isFetching,
    busy,
    waiting,
    saving: action.isPending && action.variables.kind === "save",
    markingKnown:
      prepareKnown.isPending || (known.isPending && known.variables.active),
    errorCode,
    queryError: query.isError,
    next,
    retry,
    perform,
    markKnown,
    impress: impression.mutate,
  };
}
