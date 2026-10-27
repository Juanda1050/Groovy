import type { InfiniteData, Query, QueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/stores/authStore";
import type { getAlbumPostReactions } from "@/features/community/services/communityService";
import { profileKey } from "@/features/profile/hooks/useProfile";
import { savedProfileSchema } from "@/features/profile/lib/profileValidation";

import type {
  AlbumFeedCursor,
  AlbumFeedPage,
  AlbumPostCommentPage,
  FeedProfile,
  PublicProfile,
} from "@/models/library";

import type { ProfileSearchPage } from "@/models/profile";

type ReactionsPage = Awaited<ReturnType<typeof getAlbumPostReactions>>;

export async function syncProfileCache(
  client: QueryClient,
  userId: string,
  value: unknown,
): Promise<void> {
  const parsed = savedProfileSchema.safeParse(value);

  if (
    !parsed.success ||
    parsed.data.id !== userId ||
    useAuthStore.getState().user?.id !== userId
  ) {
    return;
  }

  const profile = parsed.data;

  const author: FeedProfile = {
    id: profile.id,
    display_name: profile.display_name,
    username: profile.username,
    avatar_url: profile.avatar_url,
  };

  function affected(query: Query): boolean {
    const [kind, viewerId, targetId] = query.queryKey;

    if (viewerId !== userId) return false;

    switch (kind) {
      case "profile":
      case "albumFeed":
      case "postComments":
      case "postReactions":
      case "profileSearch":
        return true;

      case "feedProfile":
      case "publicProfile":
        return targetId === userId;

      default:
        return false;
    }
  }

  await client.cancelQueries({
    predicate: affected,
  });

  if (useAuthStore.getState().user?.id !== userId) return;

  client.setQueryData(profileKey(userId), profile);

  client.setQueryData<FeedProfile>(["feedProfile", userId, userId], author);

  client.setQueriesData<InfiniteData<AlbumFeedPage, AlbumFeedCursor | null>>(
    {
      queryKey: ["albumFeed", userId],
    },
    (previous) =>
      previous
        ? {
            ...previous,
            pages: previous.pages.map((page) => ({
              ...page,
              items: page.items.map((post) =>
                post.user_id === userId
                  ? {
                      ...post,
                      author,
                    }
                  : post,
              ),
            })),
          }
        : previous,
  );

  client.setQueriesData<PublicProfile>(
    {
      queryKey: ["publicProfile", userId, userId],
      exact: true,
    },
    (previous) =>
      previous
        ? {
            ...previous,
            ...author,
            bio: profile.bio,
          }
        : previous,
  );

  client.setQueriesData<
    InfiniteData<AlbumPostCommentPage, AlbumFeedCursor | null>
  >(
    {
      queryKey: ["postComments", userId],
    },
    (previous) =>
      previous
        ? {
            ...previous,
            pages: previous.pages.map((page) => ({
              ...page,
              items: page.items.map((comment) =>
                comment.user_id === userId
                  ? {
                      ...comment,
                      display_name: profile.display_name,
                      username: profile.username,
                      avatar_url: profile.avatar_url,
                    }
                  : comment,
              ),
            })),
          }
        : previous,
  );

  client.setQueriesData<InfiniteData<ReactionsPage, AlbumFeedCursor | null>>(
    {
      queryKey: ["postReactions", userId],
    },
    (previous) =>
      previous
        ? {
            ...previous,
            pages: previous.pages.map((page) => ({
              ...page,
              items: page.items.map((person) =>
                person.id === userId
                  ? {
                      ...person,
                      display_name: profile.display_name,
                      username: profile.username ?? "",
                      avatar_url: profile.avatar_url ?? "",
                    }
                  : person,
              ),
            })),
          }
        : previous,
  );

  client.setQueriesData<ProfileSearchPage>(
    {
      queryKey: ["profileSearch", userId],
    },
    (previous) =>
      previous
        ? {
            ...previous,
            items: previous.items.map((person) =>
              person.id === userId
                ? {
                    ...person,
                    ...author,
                  }
                : person,
            ),
          }
        : previous,
  );

  void client.invalidateQueries({
    queryKey: ["profileSearch", userId],
    refetchType: "active",
  });

  void client.invalidateQueries({
    predicate: (query) => affected(query) && query.state.data === undefined,
    refetchType: "active",
  });
}
