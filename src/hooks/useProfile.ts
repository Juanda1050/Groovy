import { useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  type InfiniteData,
  useIsMutating,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/app/queryClient";
import { syncAlbumLibrary } from "@/lib/albumQueries";
import { prepareAvatar } from "@/lib/avatarImage";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/lib/libraryErrors";
import {
  normalizeReview,
  countReviewCharacters,
  reviewMaxLength,
} from "@/lib/reviewText";
import {
  discardProfileAvatar,
  getAvatarUrl,
  getAlbumPostComments,
  writeAlbumPostComment,
  watchAlbumPostComments,
  getCommunitySocial,
  getProfile,
  getPublicProfile,
  getUserSettings,
  saveProfileAvatar,
  searchPublicProfiles,
  setCommunityAction,
} from "@/services/profileService";
import { useAuthStore } from "@/stores/authStore";

import type {
  AlbumFeedCursor,
  AlbumPostCommentPage,
  AlbumPostCommentEdit,
  AlbumPostCommentWrite,
  CommunityAction,
  CommunityPostState,
} from "@/models/library";
import type { AvatarDraft, Profile, ProfileSearchPage } from "@/models/profile";

const accountStaleTime = 5 * 60_000;

export function profileKey(userId: string | null) {
  return ["profile", userId] as const;
}

export function userSettingsKey(userId: string | null) {
  return ["userSettings", userId] as const;
}

export function profileWriteKey(userId: string | null) {
  return ["profileWrite", userId] as const;
}

function getAvatarErrorKey(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  switch (code) {
    case "AVATAR_INVALID_TYPE":
      return "avatar.errors.type";
    case "AVATAR_SOURCE_TOO_LARGE":
      return "avatar.errors.sourceSize";
    case "AVATAR_INVALID_RESOLUTION":
      return "avatar.errors.resolution";
    case "AVATAR_INVALID_IMAGE":
      return "avatar.errors.invalidImage";
    case "AVATAR_ENCODING_FAILED":
    case "AVATAR_OUTPUT_TOO_LARGE":
    case "AVATAR_INVALID_UPLOAD":
      return "avatar.errors.processing";
    case "AUTH_REQUIRED":
    case "SESSION_EXPIRED":
      return "avatar.errors.session";
    case "RATE_LIMITED":
      return "avatar.errors.rate";
    default:
      return "avatar.errors.save";
  }
}

export function useProfile() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: profileKey(userId),
    enabled: userId !== null,
    staleTime: accountStaleTime,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Authentication required.");
      return getProfile(userId, signal);
    },
  });
}

export function useUserSettings() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: userSettingsKey(userId),
    enabled: userId !== null,
    staleTime: accountStaleTime,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Authentication required.");
      return getUserSettings(userId, signal);
    },
  });
}

export function useAvatarUrl(source: string | null | undefined) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const direct = Boolean(
    source?.startsWith("blob:") || source?.startsWith("https://"),
  );

  const query = useQuery({
    queryKey: ["avatar", userId, source ?? null],
    enabled: userId !== null && Boolean(source) && !direct,
    queryFn: () => {
      if (!source) throw new Error("AVATAR_NOT_FOUND");
      return getAvatarUrl(source);
    },
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchInterval: 50 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  return {
    src: direct ? (source ?? null) : (query.data ?? null),
    direct,
    refresh: query.refetch,
  };
}

export function useProfileAvatar() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const writes = useIsMutating({
    mutationKey: profileWriteKey(userId),
  });

  const [draft, setDraft] = useState<AvatarDraft | null>(null);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const mounted = useRef(false);
  const revision = useRef(0);
  const currentDraft = draft?.userId === userId ? draft : null;
  const previewUrl = currentDraft?.previewUrl;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      revision.current += 1;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const mutation = useMutation({
    mutationKey: profileWriteKey(userId),
    mutationFn: saveProfileAvatar,
    retry: false,
    onSuccess: (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      queryClient.setQueryData<Profile>(profileKey(request.userId), saved);
      setDraft(null);
      setLocalError(null);
    },
  });

  async function cleanupDraft(pending: AvatarDraft): Promise<void> {
    const current = await discardProfileAvatar(
      pending.userId,
      pending.path,
    ).catch(() => null);

    if (current && useAuthStore.getState().user?.id === pending.userId) {
      queryClient.setQueryData(profileKey(pending.userId), current);
    }
  }

  async function onChoose(file: File): Promise<void> {
    if (!userId || processing || writes > 0) return;

    const requestedUserId = userId;
    const currentRevision = ++revision.current;
    const previous = currentDraft;
    const previousAttempted =
      previous !== null && mutation.variables?.path === previous.path;

    setProcessing(true);
    setLocalError(null);
    mutation.reset();

    try {
      const blob = await prepareAvatar(file);

      if (
        !mounted.current ||
        revision.current !== currentRevision ||
        useAuthStore.getState().user?.id !== requestedUserId
      ) {
        return;
      }

      setDraft({
        userId: requestedUserId,
        path: `${requestedUserId}/${crypto.randomUUID()}.webp`,
        blob,
        previewUrl: URL.createObjectURL(blob),
      });

      if (previous && previousAttempted) void cleanupDraft(previous);
    } catch (error: unknown) {
      if (mounted.current && revision.current === currentRevision) {
        setLocalError(getAvatarErrorKey(error));
      }
    } finally {
      if (mounted.current && revision.current === currentRevision) {
        setProcessing(false);
      }
    }
  }

  function onSave(): void {
    if (
      !userId ||
      !currentDraft ||
      processing ||
      queryClient.isMutating({
        mutationKey: profileWriteKey(userId),
      }) > 0
    ) {
      return;
    }

    mutation.mutate({
      userId,
      path: currentDraft.path,
      file: currentDraft.blob,
    });
  }

  function onCancel(): void {
    if (processing || writes > 0) return;

    const previous = currentDraft;
    const attempted =
      previous !== null && mutation.variables?.path === previous.path;

    setDraft(null);
    setLocalError(null);
    mutation.reset();

    if (previous && attempted) void cleanupDraft(previous);
  }

  return {
    previewUrl,
    hasDraft: currentDraft !== null,
    busy: processing || writes > 0,
    processing,
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    errorKey:
      localError ??
      (mutation.isError ? getAvatarErrorKey(mutation.error) : null),
    onChoose,
    onSave,
    onCancel,
  };
}

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

export function usePublicProfile(profileId: string) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: ["publicProfile", userId, profileId],
    enabled: Boolean(userId && profileId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");
      return getPublicProfile(userId, profileId, signal);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

export function useCommunityUserSearch(value: string, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();

  const term = value
    .trim()
    .replace(/^@+/u, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLowerCase();

  const length = [...term].length;
  const canSearch = enabled && Boolean(userId) && length >= 2 && length <= 50;

  const [debounced, setDebounced] = useState({ userId, term: "" });
  const waiting =
    canSearch && (debounced.userId !== userId || debounced.term !== term);

  useEffect(() => {
    if (!canSearch) return;
    const timer = window.setTimeout(() => setDebounced({ userId, term }), 300);
    return () => window.clearTimeout(timer);
  }, [canSearch, userId, term]);

  const query = useQuery({
    queryKey: ["profileSearch", userId, term],
    enabled: canSearch && !waiting,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      const page = await searchPublicProfiles(userId, term, signal);
      signal.throwIfAborted();

      if (useAuthStore.getState().user?.id !== userId) {
        throw new Error("AUTH_REQUIRED");
      }

      for (const item of page.items) {
        client.setQueryData(["feedProfile", userId, item.id], {
          id: item.id,
          display_name: item.display_name,
          username: item.username,
          avatar_url: item.avatar_url,
        });
      }

      return page;
    },
  });

  return {
    canSearch,
    items: canSearch ? (query.data?.items ?? []) : [],
    hasMore: canSearch && Boolean(query.data?.hasMore),
    loading: canSearch && !query.data && (waiting || query.isPending),
    fetching: query.isFetching,
    error: canSearch && !waiting && query.isError,
    canRetry: canSearch && !waiting && !query.isFetching,
    onRetry: () => {
      if (canSearch && !waiting) void query.refetch();
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

export function useAlbumPostComments(postId: string, open: boolean) {
  const { t } = useTranslation("community");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const key = ["postComments", userId, postId];
  const writeKey = ["postCommentWrite", userId, postId];
  const writes = useIsMutating({ mutationKey: writeKey });

  const [draft, setDraft] = useState({ userId, value: "" });
  const [updates, setUpdates] = useState(false);
  const [edit, setEdit] = useState<AlbumPostCommentEdit | null>(null);
  const [offline, setOffline] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const ownUpdates = useRef(new Map<string, number>());
  const attempt = useRef<AlbumPostCommentWrite | null>(null);
  const ownWrites = useRef(new Set<string>());
  const events = useRef(0);

  const value = draft.userId === userId ? draft.value : "";
  const body = normalizeReview(value);
  const length = countReviewCharacters(value);

  const query = useInfiniteQuery({
    queryKey: key,
    enabled: open && Boolean(userId),
    initialPageParam: null as AlbumFeedCursor | null,
    queryFn: ({ pageParam, signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");
      return getAlbumPostComments(userId, postId, pageParam, signal);
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(
      () => setRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    if (!open || !userId) return;

    const queryKey = ["postComments", userId, postId];

    return watchAlbumPostComments(userId, (event) => {
      if (useAuthStore.getState().user?.id !== userId) return;

      if (!("postId" in event)) {
        setOffline(event.kind === "offline");

        if (event.kind === "connected") {
          void client.invalidateQueries({ queryKey }, { cancelRefetch: false });
        }
        return;
      }

      if (event.postId !== postId) return;
      events.current += 1;

      if (event.kind === "removed") {
        void client.cancelQueries({ queryKey });

        client.setQueryData<
          InfiniteData<AlbumPostCommentPage, AlbumFeedCursor | null>
        >(queryKey, (previous) =>
          previous
            ? {
                ...previous,
                pages: previous.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((item) => item.id !== event.id),
                })),
              }
            : previous,
        );
      } else if (event.kind === "changed") {
        const cached = client
          .getQueryData<
            InfiniteData<AlbumPostCommentPage, AlbumFeedCursor | null>
          >(queryKey)
          ?.pages.flatMap((page) => page.items)
          .find((item) => item.id === event.id);

        if (
          event.revision > 0 &&
          ((cached?.revision ?? 0) >= event.revision ||
            ownUpdates.current.get(event.id) === event.revision)
        ) {
          return;
        }

        void client.invalidateQueries({ queryKey }, { cancelRefetch: false });
      } else if (!ownWrites.current.has(event.id)) {
        setUpdates(true);
        void client.invalidateQueries({
          queryKey,
          refetchType: "none",
        });
      }
    });
  }, [client, userId, postId, open]);

  const mutation = useMutation({
    mutationKey: writeKey,
    mutationFn: writeAlbumPostComment,
    retry: false,

    onSuccess: async (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      const queryKey = ["postComments", request.userId, request.postId];

      await client.cancelQueries({ queryKey });

      client.setQueryData<
        InfiniteData<AlbumPostCommentPage, AlbumFeedCursor | null>
      >(queryKey, (previous) =>
        previous
          ? {
              ...previous,
              pages:
                request.action === "save"
                  ? previous.pages.slice(0, 1)
                  : previous.pages.map((page) => ({
                      ...page,
                      items:
                        request.action === "delete"
                          ? page.items.filter(
                              (item) => item.id !== request.commentId,
                            )
                          : page.items.map((item) =>
                              item.id === request.commentId &&
                              saved &&
                              (item.revision ?? 1) <= saved.revision
                                ? { ...item, ...saved }
                                : item,
                            ),
                    })),
              pageParams:
                request.action === "save"
                  ? previous.pageParams.slice(0, 1)
                  : previous.pageParams,
            }
          : previous,
      );

      if (request.action === "save") {
        setDraft({ userId: request.userId, value: "" });
        attempt.current = null;
        await client.invalidateQueries({ queryKey });
      } else {
        if (request.action === "update") {
          ownUpdates.current.delete(request.commentId);

          setEdit((current) =>
            current?.id === request.commentId &&
            current.userId === request.userId
              ? null
              : current,
          );
        }

        void client.invalidateQueries({
          queryKey,
          refetchType: "none",
        });
      }

      toast.add({
        type: "success",
        title: t(
          request.action === "save"
            ? "comments.sent"
            : request.action === "update"
              ? "comments.updated"
              : "comments.deleted",
        ),
        timeout: 2600,
      });
    },

    onError: (error, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      if (request.action === "update") {
        ownUpdates.current.delete(request.commentId);

        void client.invalidateQueries(
          {
            queryKey: ["postComments", request.userId, request.postId],
          },
          { cancelRefetch: false },
        );
      }

      const code = getLibraryErrorCode(error);
      const limited = code === "RATE_LIMITED";
      const seconds = limited ? getLibraryRetrySeconds(error) : 0;

      if (limited) setRemaining(seconds);

      const message = limited
        ? "social.rateError"
        : ["AUTH_REQUIRED", "SESSION_EXPIRED", "UNAUTHORIZED"].includes(code)
          ? "social.sessionError"
          : code === "COMMENT_CONFLICT"
            ? "comments.editConflict"
            : ["POST_NOT_FOUND", "COMMENT_NOT_FOUND"].includes(code)
              ? "comments.unavailable"
              : "comments.writeError";

      toast.add({
        type: "error",
        title: t(message),
        timeout: 5000,
        ...(limited
          ? { description: t("social.retryAfter", { count: seconds }) }
          : {}),
      });
    },
  });

  const items = [
    ...new Map(
      (query.data?.pages ?? [])
        .flatMap((page) => page.items)
        .map((item) => [item.id, item]),
    ).values(),
  ];

  const editing =
    edit?.userId === userId && items.some((item) => item.id === edit.id)
      ? edit
      : null;

  const currentComment = items.find((item) => item.id === editing?.id);

  const editLength = countReviewCharacters(editing?.value ?? "");
  const editBody = normalizeReview(editing?.value ?? "");

  const editConflict = Boolean(
    editing &&
    currentComment &&
    (currentComment.revision ?? 1) !== editing.revision,
  );

  const busy = writes > 0;

  const canSaveEdit = Boolean(
    userId &&
    editing &&
    editBody &&
    editBody !== editing.originalBody &&
    editLength <= reviewMaxLength &&
    !busy &&
    !query.isFetching &&
    !editConflict &&
    remaining === 0,
  );

  const canSubmit = Boolean(
    userId && body && length <= reviewMaxLength && !busy && remaining === 0,
  );

  function onSubmit(): void {
    if (
      !canSubmit ||
      !userId ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    const previous = attempt.current;

    const request: AlbumPostCommentWrite =
      previous?.action === "save" &&
      previous.userId === userId &&
      previous.postId === postId &&
      previous.body === body
        ? previous
        : {
            action: "save",
            userId,
            postId,
            commentId: crypto.randomUUID(),
            body,
          };

    attempt.current = request;
    ownWrites.current.add(request.commentId);

    if (ownWrites.current.size > 20) {
      const first = ownWrites.current.values().next().value;
      if (first) ownWrites.current.delete(first);
    }

    mutation.mutate(request);
  }

  function onStartEdit(commentId: string): void {
    if (
      !userId ||
      editing ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    const item = items.find(
      (row) => row.id === commentId && row.user_id === userId,
    );

    if (item) {
      setEdit({
        userId,
        id: item.id,
        originalBody: normalizeReview(item.body),
        revision: item.revision ?? 1,
        value: item.body,
      });
    }
  }

  function onSaveEdit(): void {
    if (
      !canSaveEdit ||
      !editing ||
      !userId ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    ownUpdates.current.set(editing.id, editing.revision + 1);

    mutation.mutate({
      action: "update",
      userId,
      postId,
      commentId: editing.id,
      body: editBody,
      expectedRevision: editing.revision,
    });
  }

  function onRebaseEdit(): void {
    if (!editing || !currentComment || busy || query.isFetching) {
      return;
    }

    setEdit({
      ...editing,
      originalBody: normalizeReview(currentComment.body),
      revision: currentComment.revision ?? 1,
    });
  }

  async function onDelete(commentId: string): Promise<boolean> {
    if (!userId || client.isMutating({ mutationKey: writeKey }) > 0) {
      return false;
    }

    try {
      await mutation.mutateAsync({
        action: "delete",
        userId,
        postId,
        commentId,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function onRefresh(): Promise<void> {
    if (query.isFetching || !userId) return;

    const revision = events.current;

    client.setQueryData<
      InfiniteData<AlbumPostCommentPage, AlbumFeedCursor | null>
    >(key, (previous) =>
      previous
        ? {
            pages: previous.pages.slice(0, 1),
            pageParams: previous.pageParams.slice(0, 1),
          }
        : previous,
    );

    const result = await query.refetch();

    if (
      !result.isError &&
      events.current === revision &&
      useAuthStore.getState().user?.id === userId
    ) {
      setUpdates(false);
    }
  }

  return {
    userId,
    editingId: editing?.id ?? null,
    editValue: editing?.value ?? "",
    editLength,
    editConflict,
    currentEditBody: currentComment?.body ?? "",
    canSaveEdit,
    onStartEdit,
    onSaveEdit,
    onRebaseEdit,

    onEditChange: (value: string) =>
      setEdit((current) =>
        current?.userId === userId ? { ...current, value } : current,
      ),

    onCancelEdit: () => {
      if (!busy) setEdit(null);
    },

    value,
    length,
    maxLength: reviewMaxLength,
    items,
    busy,
    canSubmit,
    updates,
    offline,
    remaining,
    pending: Boolean(userId) && query.isPending,
    fetching: query.isFetching,
    error: query.isError,
    loadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    nextError: query.isFetchNextPageError,

    onChange: (next: string) => setDraft({ userId, value: next }),
    onSubmit,
    onDelete,

    onRefresh: () => {
      void onRefresh();
    },

    onRetry: () => {
      void query.refetch();
    },

    onMore: () => {
      if (query.hasNextPage && !query.isFetching) {
        void query.fetchNextPage();
      }
    },
  };
}
