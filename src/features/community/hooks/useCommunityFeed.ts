import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAlbumMetadata } from "@/features/catalog/services/albumMetadataService";
import { watchAlbumPostComments } from "@/features/community/services/commentService";
import {
  getAlbumFeed,
  watchCommunityFeed,
} from "@/features/community/services/feedService";
import type {
  AlbumFeedCursor,
  AlbumFeedItem,
  AlbumFeedPage,
  AlbumPostCommentPage,
  CommunityPostState,
  FeedAlbum,
  FeedProfile,
} from "@/models/library";

type FeedData = InfiniteData<AlbumFeedPage, AlbumFeedCursor | null>;
type LoadedPage = AlbumFeedPage & { metadataError: boolean };

function assertCurrent(userId: string, signal: AbortSignal): void {
  signal.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function seedSocial(
  client: QueryClient,
  userId: string,
  postIds: string[],
  rows: CommunityPostState[],
  startedAt: number,
): void {
  const cached = client.getQueriesData<CommunityPostState[]>({
    queryKey: ["communitySocial", userId],
  });

  const latest = new Map<
    string,
    { row: CommunityPostState; updatedAt: number }
  >();

  for (const [key, values] of cached) {
    const updatedAt = client.getQueryState(key)?.dataUpdatedAt ?? 0;

    for (const row of values ?? []) {
      if ((latest.get(row.post_id)?.updatedAt ?? -1) <= updatedAt) {
        latest.set(row.post_id, { row, updatedAt });
      }
    }
  }

  const writing =
    client.isMutating({
      mutationKey: ["communityWrite", userId],
    }) > 0;

  for (const row of rows) {
    const current = latest.get(row.post_id);

    if (!current || (!writing && current.updatedAt <= startedAt)) {
      latest.set(row.post_id, { row, updatedAt: startedAt });
    }
  }

  const ids = [...new Set(postIds)].sort();

  for (let offset = 0; offset < ids.length; offset += 40) {
    const group = ids.slice(offset, offset + 40);
    const values = group.flatMap((id) => {
      const value = latest.get(id);
      return value ? [value.row] : [];
    });

    if (values.length !== group.length) continue;

    const key = ["communitySocial", userId, group];
    const state = client.getQueryState(key);

    if ((state?.dataUpdatedAt ?? 0) > startedAt) continue;

    client.setQueryData<CommunityPostState[]>(key, values);
  }
}

async function loadFeedPage(
  client: QueryClient,
  key: readonly unknown[],
  userId: string,
  cursor: AlbumFeedCursor | null,
  signal: AbortSignal,
  profileId: string | null,
  followingOnly: boolean,
): Promise<LoadedPage> {
  const startedAt = Date.now();

  const page = await getAlbumFeed(
    userId,
    cursor,
    signal,
    profileId,
    followingOnly,
  );

  assertCurrent(userId, signal);

  const profiles = [
    ...page.profiles,
    ...page.previews.flatMap((preview) =>
      preview.items.map((comment) => ({
        id: comment.user_id,
        display_name: comment.display_name,
        username: comment.username,
        avatar_url: comment.avatar_url,
      })),
    ),
  ];

  for (const profile of profiles) {
    const profileKey = ["feedProfile", userId, profile.id];
    const state = client.getQueryState(profileKey);

    if ((state?.dataUpdatedAt ?? 0) <= startedAt) {
      client.setQueryData<FeedProfile>(profileKey, profile);
    }
  }

  for (const album of page.albums) {
    const albumKey = ["feedAlbum", userId, album.id];
    const state = client.getQueryState(albumKey);

    if ((state?.dataUpdatedAt ?? 0) <= startedAt) {
      client.setQueryData<FeedAlbum>(albumKey, album);
    }
  }

  const retained = client.getQueryData<FeedData>(key);

  seedSocial(
    client,
    userId,
    [
      ...(retained?.pages.flatMap((item) =>
        item.items.map((post) => post.id),
      ) ?? []),
      ...page.items.map((post) => post.id),
    ],
    page.social,
    startedAt,
  );

  for (const preview of page.previews) {
    const commentKey = ["postComments", userId, preview.postId];
    const state = client.getQueryState(commentKey);
    const previous =
      client.getQueryData<
        InfiniteData<AlbumPostCommentPage, AlbumFeedCursor | null>
      >(commentKey);

    const hasFullConversation = Boolean(
      previous &&
      (previous.pages.length > 1 || (previous.pages[0]?.items.length ?? 0) > 2),
    );

    if (
      hasFullConversation ||
      state?.fetchStatus === "fetching" ||
      (state?.dataUpdatedAt ?? 0) > startedAt ||
      client.isMutating({
        mutationKey: ["postCommentWrite", userId, preview.postId],
      }) > 0
    ) {
      continue;
    }

    client.setQueryData<
      InfiniteData<AlbumPostCommentPage, AlbumFeedCursor | null>
    >(commentKey, {
      pages: [
        {
          items: preview.items,
          nextCursor: preview.nextCursor,
        },
      ],
      pageParams: [null],
    });
  }

  const albumIds = [
    ...new Set(page.items.map((post) => post.spotify_album_id)),
  ];

  const missing = albumIds.filter(
    (id) => !client.getQueryData<FeedAlbum | null>(["feedAlbum", userId, id]),
  );

  if (missing.length > 0) {
    try {
      const recovered = await getAlbumMetadata(
        userId,
        missing.slice(0, 2),
        signal,
      );

      assertCurrent(userId, signal);

      for (const album of recovered) {
        const albumKey = ["feedAlbum", userId, album.id];

        if ((client.getQueryState(albumKey)?.dataUpdatedAt ?? 0) <= startedAt) {
          client.setQueryData<FeedAlbum>(albumKey, album);
        }
      }
    } catch (error: unknown) {
      assertCurrent(userId, signal);

      console.warn(
        "COMMUNITY_METADATA_RECOVERY_FAILED",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  assertCurrent(userId, signal);

  return {
    items: page.items.map((post) => ({
      ...post,
      author:
        client.getQueryData<FeedProfile | null>([
          "feedProfile",
          userId,
          post.user_id,
        ]) ?? null,
      album:
        client.getQueryData<FeedAlbum | null>([
          "feedAlbum",
          userId,
          post.spotify_album_id,
        ]) ?? null,
    })),
    nextCursor: page.nextCursor,
    metadataError: albumIds.some(
      (id) => !client.getQueryData<FeedAlbum | null>(["feedAlbum", userId, id]),
    ),
  };
}

export function useCommunityFeed(
  profileId: string | null = null,
  enabled = true,
  followingOnly = false,
) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const [notices, setNotices] = useState<Record<string, boolean>>({});
  const [connection, setConnection] = useState<{
    userId: string | null;
    value: "connecting" | "live" | "offline";
  }>({ userId: null, value: "connecting" });

  const events = useRef(0);

  const scope =
    `${userId}:` +
    (profileId
      ? `profile:${profileId}`
      : followingOnly
        ? "following"
        : "community");

  const key = profileId
    ? ["albumFeed", userId, "profile", profileId]
    : followingOnly
      ? ["albumFeed", userId, "following"]
      : ["albumFeed", userId];

  const query = useInfiniteQuery({
    queryKey: key,
    enabled: enabled && Boolean(userId),
    initialPageParam: null as AlbumFeedCursor | null,
    queryFn: ({ pageParam, signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return loadFeedPage(
        client,
        key,
        userId,
        pageParam,
        signal,
        profileId,
        followingOnly,
      );
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    maxPages: 4,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!userId || !enabled) return;

    return client.getQueryCache().subscribe((event) => {
      if (
        event.type !== "updated" ||
        event.action.type !== "success" ||
        event.query.queryKey[0] !== "albumFeedSignal" ||
        event.query.queryKey[1] !== userId ||
        useAuthStore.getState().user?.id !== userId
      ) {
        return;
      }

      events.current += 1;

      setNotices((previous) => ({
        ...previous,
        [`${userId}:community`]: true,
        [`${userId}:following`]: true,
        [scope]: true,
      }));
    });
  }, [client, userId, enabled, scope]);

  useEffect(() => {
    if (!userId || profileId || !enabled) return;

    let active = true;
    let lastResume = 0;
    const feedKey = ["albumFeed", userId];

    const current = () => active && useAuthStore.getState().user?.id === userId;

    const notify = (): void => {
      if (!current()) return;

      void client.invalidateQueries({
        queryKey: feedKey,
        refetchType: "none",
      });

      client.setQueryData<number>(
        ["albumFeedSignal", userId],
        (previous = 0) => previous + 1,
      );
    };

    const stopFeed = watchCommunityFeed(userId, (event) => {
      if (!current()) return;

      if (event.kind === "connected") {
        setConnection({ userId, value: "live" });

        if (event.resumed) notify();
        return;
      }

      if (event.kind === "offline") {
        setConnection({ userId, value: "offline" });
        return;
      }

      if (event.kind === "removed") {
        void client.cancelQueries({ queryKey: feedKey });

        client.setQueriesData<FeedData>({ queryKey: feedKey }, (previous) =>
          previous
            ? {
                ...previous,
                pages: previous.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((post) => post.id !== event.id),
                })),
              }
            : previous,
        );
      } else {
        notify();
      }
    });

    const stopComments = watchAlbumPostComments(userId, (event) => {
      if (current() && "postId" in event) notify();
    });

    const reconcile = (): void => {
      if (!current() || document.visibilityState !== "visible") return;

      const now = Date.now();

      if (now - lastResume < 15_000) return;

      lastResume = now;
      notify();
    };

    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);

    return () => {
      active = false;
      stopFeed();
      stopComments();
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
    };
  }, [client, userId, profileId, enabled]);

  useEffect(() => {
    if (!userId || profileId || !enabled) return;

    return client.getMutationCache().subscribe((event) => {
      if (
        event.type !== "updated" ||
        (event.action.type !== "success" && event.action.type !== "error") ||
        event.mutation.options.mutationKey?.[0] !== "communityWrite" ||
        useAuthStore.getState().user?.id !== userId
      ) {
        return;
      }

      const request: unknown = event.mutation.state.variables;

      if (
        typeof request !== "object" ||
        request === null ||
        !("userId" in request) ||
        request.userId !== userId ||
        !("action" in request) ||
        request.action !== "follow" ||
        !("targetId" in request) ||
        typeof request.targetId !== "string" ||
        !("active" in request) ||
        typeof request.active !== "boolean"
      ) {
        return;
      }

      const followingKey = ["albumFeed", userId, "following"];
      const removeAuthor = event.action.type === "success" && !request.active;
      const authorId = request.targetId;

      void client.cancelQueries({ queryKey: followingKey }).then(() => {
        if (useAuthStore.getState().user?.id !== userId) return;

        if (removeAuthor) {
          client.setQueriesData<FeedData>(
            { queryKey: followingKey },
            (previous) =>
              previous
                ? {
                    ...previous,
                    pages: previous.pages.map((page) => ({
                      ...page,
                      items: page.items.filter(
                        (post) => post.user_id !== authorId,
                      ),
                    })),
                  }
                : previous,
          );
        }

        void client.invalidateQueries({ queryKey: followingKey });
      });
    });
  }, [client, userId, profileId, enabled]);

  const unique = new Map<string, AlbumFeedItem>();

  for (const page of query.data?.pages ?? []) {
    for (const post of page.items) {
      const previous = unique.get(post.id);

      if (!previous || previous.revision < post.revision) {
        unique.set(post.id, post);
      }
    }
  }

  async function onRefresh(): Promise<void> {
    if (
      !userId ||
      query.isFetching ||
      useAuthStore.getState().user?.id !== userId
    ) {
      return;
    }

    const revision = events.current;

    await client.cancelQueries({ queryKey: key, exact: true });

    if (useAuthStore.getState().user?.id !== userId) return;

    client.setQueryData<FeedData>(key, (previous) =>
      previous
        ? {
            pages: previous.pages.slice(0, 1),
            pageParams: [null],
          }
        : previous,
    );

    const result = await query.refetch();

    if (
      !result.isError &&
      events.current === revision &&
      useAuthStore.getState().user?.id === userId
    ) {
      setNotices((previous) => ({ ...previous, [scope]: false }));
    }
  }

  const metadataError =
    query.data?.pages.some((page) => page.metadataError) ?? false;

  return {
    items: [...unique.values()],
    needsSignIn: !userId,
    pending: query.isPending,
    error: query.isError || metadataError,
    nextError: query.isFetchNextPageError,
    fetching: query.isFetching,
    loadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    updates: notices[scope] ?? false,
    connection: connection.userId === userId ? connection.value : "connecting",
    onRefresh: () => {
      void onRefresh();
    },
    onRetry: () => {
      void query.refetch();
    },
    onLoadMore: () => {
      if (query.hasNextPage && !query.isFetching) {
        void query.fetchNextPage();
      }
    },
  };
}
