import { toast } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAlbumPostComments,watchAlbumPostComments,writeAlbumPostComment } from "@/features/community/services/commentService";
import { getLibraryErrorCode,getLibraryRetrySeconds } from "@/features/library/lib/libraryErrors";
import { countReviewCharacters,normalizeReview,reviewMaxLength } from "@/features/library/lib/reviewText";
import type { AlbumFeedCursor,AlbumPostCommentEdit,AlbumPostCommentPage,AlbumPostCommentWrite } from "@/models/library";
import {
useInfiniteQuery,
useIsMutating,
useMutation,
useQueryClient,
type InfiniteData
} from "@tanstack/react-query";
import { useEffect,useRef,useState } from "react";
import { useTranslation } from "react-i18next";

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
