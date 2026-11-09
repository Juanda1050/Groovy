import { z } from "zod";

import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  createSignal,
  requireUser,
} from "@/features/library/services/libraryService";
import type { AlbumFeedCursor } from "@/models/library";
import { supabase } from "@/shared/lib/supabaseClient";

const uuid = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const spotifyId = z.string().regex(/^[A-Za-z0-9]{22}$/);

const cursorSchema = z.object({
  createdAt: timestamp,
  id: uuid,
});

const profileSchema = z.object({
  id: uuid,
  display_name: z.string(),
  username: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

const albumSchema = z.object({
  id: spotifyId,
  name: z.string().min(1),
  coverUrl: z.string().nullable(),
  artists: z.array(z.string()),
});

const postSchema = z
  .object({
    id: uuid,
    user_id: uuid,
    user_album_id: uuid.nullable(),
    spotify_album_id: spotifyId,
    post_kind: z.enum(["listened", "favorite"]).default("listened"),
    rating: z.number().finite().nullable(),
    review: z.string().nullable(),
    visibility: z.literal("community"),
    created_at: timestamp,
    updated_at: timestamp,
    published_at: timestamp.optional(),
    revision: z.number().int().positive(),
  })
  .refine((post) =>
    post.post_kind === "favorite"
      ? post.user_album_id === null &&
        post.rating === null &&
        post.review === null
      : post.user_album_id !== null,
  )
  .transform((post) => ({
    ...post,
    published_at: post.published_at ?? post.updated_at,
  }));

const socialSchema = z.object({
  post_id: uuid,
  reaction_count: z.number().int().nonnegative(),
  reacted: z.boolean(),
  following_author: z.boolean(),
  library_status: z.enum(["pending", "listened"]).nullable(),
});

const commentSchema = z.object({
  id: uuid,
  post_id: uuid,
  user_id: uuid,
  body: z.string(),
  created_at: timestamp,
  edited_at: timestamp.nullable(),
  revision: z.number().int().positive(),
  display_name: z.string(),
  username: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

const pageSchema = z.object({
  userId: uuid,
  items: z.array(postSchema).max(10),
  nextCursor: cursorSchema.nullable(),
  profiles: z.array(profileSchema).max(10),
  albums: z.array(albumSchema).max(10),
  social: z.array(socialSchema).max(10),
  previews: z
    .array(
      z.object({
        postId: uuid,
        totalCount: z.number().int().nonnegative(),
        items: z.array(commentSchema).max(2),
        nextCursor: cursorSchema.nullable(),
      }),
    )
    .max(10),
});

function assertCurrent(userId: string, signal?: AbortSignal): void {
  signal?.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getAlbumFeed(
  userId: string,
  cursor: AlbumFeedCursor | null,
  signal: AbortSignal,
  profileId: string | null = null,
  followingOnly = false,
): Promise<z.infer<typeof pageSchema>> {
  assertCurrent(userId, signal);
  await requireUser(userId);
  assertCurrent(userId, signal);

  const result = await supabase
    .rpc("get_community_feed_page", {
      p_following_only: followingOnly,
      ...(profileId ? { p_profile_id: profileId } : {}),
      ...(cursor
        ? {
            p_before_created_at: cursor.createdAt,
            p_before_id: cursor.id,
          }
        : {}),
    })
    .abortSignal(createSignal(signal));

  assertCurrent(userId, signal);

  if (result.error) throw result.error;

  const parsed = pageSchema.safeParse(result.data);

  if (!parsed.success || parsed.data.userId !== userId) {
    throw new Error("INVALID_POST_RESPONSE");
  }

  const page = parsed.data;
  const ids = new Set(page.items.map((post) => post.id));
  const authors = new Set(page.items.map((post) => post.user_id));
  const albums = new Set(page.items.map((post) => post.spotify_album_id));

  if (
    ids.size !== page.items.length ||
    page.profiles.some((profile) => !authors.has(profile.id)) ||
    page.albums.some((album) => !albums.has(album.id)) ||
    page.social.some((social) => !ids.has(social.post_id)) ||
    page.previews.some(
      (preview) =>
        !ids.has(preview.postId) ||
        preview.items.some((comment) => comment.post_id !== preview.postId),
    )
  ) {
    throw new Error("INVALID_POST_RESPONSE");
  }

  return page;
}

export type CommunityFeedEvent =
  | { kind: "connected"; resumed: boolean }
  | { kind: "offline" }
  | { kind: "new" | "changed" | "removed"; id: string };

type Listener = (event: CommunityFeedEvent) => void;

interface FeedRoom {
  userId: string;
  listeners: Set<Listener>;
  channel: ReturnType<typeof supabase.channel> | null;
  stopped: boolean;
  connected: boolean;
  everConnected: boolean;
}

let feedRoom: FeedRoom | null = null;
let roomTasks: Promise<unknown> = Promise.resolve();

function stopRoom(room: FeedRoom): void {
  room.stopped = true;

  if (!room.channel) return;

  const channel = room.channel;

  roomTasks = roomTasks
    .then(() => supabase.removeChannel(channel))
    .catch(() => {
      console.error("COMMUNITY_CHANNEL_REMOVE_FAILED");
    });
}

function emit(room: FeedRoom, event: CommunityFeedEvent): void {
  if (room.stopped || useAuthStore.getState().user?.id !== room.userId) {
    return;
  }

  for (const listener of room.listeners) listener(event);
}

export function watchCommunityFeed(
  userId: string,
  listener: Listener,
): () => void {
  if (!feedRoom || feedRoom.userId !== userId) {
    if (feedRoom) stopRoom(feedRoom);

    const room: FeedRoom = {
      userId,
      listeners: new Set(),
      channel: null,
      stopped: false,
      connected: false,
      everConnected: false,
    };

    feedRoom = room;

    roomTasks = roomTasks
      .then(async () => {
        if (room.stopped) return;

        assertCurrent(userId);
        await supabase.realtime.setAuth();
        assertCurrent(userId);

        if (room.stopped) return;

        room.channel = supabase
          .channel("groovy:community", {
            config: { private: true },
          })
          .on(
            "broadcast",
            { event: "feed_changed" },
            ({ payload }: { payload: unknown }) => {
              const parsed = z
                .object({
                  id: uuid,
                  kind: z.enum(["new", "changed", "removed"]),
                })
                .safeParse(payload);

              if (parsed.success) emit(room, parsed.data);
            },
          )
          .subscribe((status) => {
            if (room.stopped) return;

            room.connected = status === "SUBSCRIBED";

            if (room.connected) {
              const resumed = room.everConnected;
              room.everConnected = true;
              emit(room, { kind: "connected", resumed });
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              emit(room, { kind: "offline" });
            }
          });
      })
      .catch(() => emit(room, { kind: "offline" }));
  }

  const room = feedRoom;
  room.listeners.add(listener);

  if (room.connected) {
    queueMicrotask(() => {
      if (!room.stopped && room.listeners.has(listener)) {
        listener({ kind: "connected", resumed: false });
      }
    });
  }

  return () => {
    room.listeners.delete(listener);

    if (room.listeners.size === 0 && !room.stopped) {
      stopRoom(room);

      if (feedRoom === room) feedRoom = null;
    }
  };
}
