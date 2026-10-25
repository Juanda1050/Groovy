import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAlbumFeed,getFeedMetadata } from "@/features/community/services/feedService";
import type { AlbumFeedCursor,AlbumFeedItem,AlbumFeedPage,FeedAlbum,FeedProfile } from "@/models/library";
import { supabase } from "@/shared/lib/supabaseClient";
import {
useInfiniteQuery,
useQueryClient,
type InfiniteData,
type QueryClient
} from "@tanstack/react-query";
import { useEffect,useRef,useState } from "react";

async function loadFeedPage(
  client: QueryClient,
  userId: string,
  cursor: AlbumFeedCursor | null,
  signal: AbortSignal,
  profileId: string | null,
  followingOnly: boolean,
): Promise<AlbumFeedPage> {
  const page = await getAlbumFeed(
    userId,
    cursor,
    signal,
    profileId,
    followingOnly,
  );

  const profiles = [...new Set(page.items.map((post) => post.user_id))];

  const albums = [...new Set(page.items.map((post) => post.spotify_album_id))];

  const profileKey = (id: string) => ["feedProfile", userId, id];
  const albumKey = (id: string) => ["feedAlbum", userId, id];

  const now = Date.now();

  function fresh(key: readonly unknown[], age: number): boolean {
    const state = client.getQueryState(key);

    return state?.data !== undefined && now - state.dataUpdatedAt < age;
  }

  const missingProfiles = profiles.filter(
    (id) => !fresh(profileKey(id), 5 * 60_000),
  );

  const missingAlbums = albums.filter(
    (id) => !fresh(albumKey(id), 15 * 60_000),
  );

  if (missingProfiles.length || missingAlbums.length) {
    const metadata = await getFeedMetadata(
      userId,
      missingProfiles,
      missingAlbums,
      signal,
    );

    if (signal.aborted || useAuthStore.getState().user?.id !== userId) {
      throw new Error("AUTH_REQUIRED");
    }

    for (const id of missingProfiles) {
      client.setQueryData<FeedProfile | null>(
        profileKey(id),

        metadata.profiles.find((profile) => profile.id === id) ?? null,
      );
    }

    for (const id of missingAlbums) {
      client.setQueryData<FeedAlbum | null>(
        albumKey(id),

        metadata.albums.find((album) => album.id === id) ?? null,
      );
    }
  }

  return {
    ...page,

    items: page.items.map((post) => ({
      ...post,

      author:
        client.getQueryData<FeedProfile | null>(profileKey(post.user_id)) ??
        null,

      album:
        client.getQueryData<FeedAlbum | null>(
          albumKey(post.spotify_album_id),
        ) ?? null,
    })),
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

  const scope =
    `${userId}:` +
    (profileId
      ? `profile:${profileId}`
      : followingOnly
        ? "following"
        : "community");

  const updates = notices[scope] ?? false;

  const [connection, setConnection] = useState<
    "connecting" | "live" | "offline"
  >("connecting");

  const events = useRef(0);

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
        userId,
        pageParam,
        signal,
        profileId,
        followingOnly,
      );
    },

    getNextPageParam: (page) => page.nextCursor ?? undefined,

    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!userId || !enabled) return;

    return client.getQueryCache().subscribe((event) => {
      const eventKey = event.query.queryKey;

      if (
        event.type !== "updated" ||
        event.action.type !== "success" ||
        eventKey[0] !== "albumFeedSignal" ||
        eventKey[1] !== userId ||
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
    // La página mantiene la conexión compartida.
    if (!userId || profileId || !enabled) return;

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let lastResume = 0;

    const feedKey = ["albumFeed", userId];

    const currentUser = () =>
      active && useAuthStore.getState().user?.id === userId;

    function reconcile(): void {
      if (!currentUser() || document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();

      if (now - lastResume < 15_000) return;

      lastResume = now;

      void client.invalidateQueries({
        queryKey: feedKey,
      });
    }

    async function subscribe(): Promise<void> {
      try {
        await supabase.realtime.setAuth();

        if (!currentUser()) return;

        channel = supabase
          .channel("groovy:community", {
            config: {
              private: true,
            },
          })
          .on(
            "broadcast",
            {
              event: "feed_changed",
            },
            ({ payload }: { payload: unknown }) => {
              if (!currentUser() || typeof payload !== "object" || !payload) {
                return;
              }

              if (
                !("id" in payload) ||
                typeof payload.id !== "string" ||
                !("kind" in payload) ||
                !["new", "changed", "removed"].includes(String(payload.kind))
              ) {
                return;
              }

              const postId = payload.id;

              if (payload.kind === "removed") {
                void client.cancelQueries({
                  queryKey: feedKey,
                });

                client.setQueriesData<
                  InfiniteData<AlbumFeedPage, AlbumFeedCursor | null>
                >(
                  {
                    queryKey: feedKey,
                  },

                  (previous) =>
                    previous
                      ? {
                          ...previous,

                          pages: previous.pages.map((page) => ({
                            ...page,

                            items: page.items.filter(
                              (post) => post.id !== postId,
                            ),
                          })),
                        }
                      : previous,
                );

                if (!client.getQueryData(feedKey)) {
                  void client.invalidateQueries({
                    queryKey: feedKey,
                  });
                }
              } else {
                void client.invalidateQueries({
                  queryKey: feedKey,
                  refetchType: "none",
                });

                client.setQueryData<number>(
                  ["albumFeedSignal", userId],
                  (previous = 0) => previous + 1,
                );
              }
            },
          )
          .subscribe((status) => {
            if (!currentUser()) return;

            if (status === "SUBSCRIBED") {
              setConnection("live");

              if (document.visibilityState === "visible") {
                lastResume = Date.now();

                void client
                  .cancelQueries({
                    queryKey: feedKey,
                  })
                  .then(() => {
                    if (currentUser()) {
                      void client.invalidateQueries({
                        queryKey: feedKey,
                      });
                    }
                  });
              } else {
                lastResume = 0;
              }
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setConnection("offline");
            }
          });
      } catch {
        if (currentUser()) {
          setConnection("offline");
        }
      }
    }

    void subscribe();

    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);

    return () => {
      active = false;

      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);

      if (channel) {
        void supabase.removeChannel(channel);
      }
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

      void client
        .cancelQueries({
          queryKey: followingKey,
        })
        .then(() => {
          if (useAuthStore.getState().user?.id !== userId) {
            return;
          }

          if (removeAuthor) {
            client.setQueriesData<
              InfiniteData<AlbumFeedPage, AlbumFeedCursor | null>
            >(
              {
                queryKey: followingKey,
              },

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

          void client.invalidateQueries({
            queryKey: followingKey,
          });
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
    if (!userId || query.isFetching) return;

    const revision = events.current;

    await client.cancelQueries({
      queryKey: key,
      exact: true,
    });

    client.setQueryData<InfiniteData<AlbumFeedPage, AlbumFeedCursor | null>>(
      key,

      (previous) =>
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
      setNotices((previous) => ({
        ...previous,
        [scope]: false,
      }));
    }
  }

  return {
    items: [...unique.values()],

    needsSignIn: !userId,
    pending: query.isPending,
    error: query.isError,
    nextError: query.isFetchNextPageError,
    fetching: query.isFetching,
    loadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),

    updates,
    connection,

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
