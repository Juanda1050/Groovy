import { createSignal,requireUser } from "@/features/profile/services/profileService";
import type { AlbumFeedCursor,AlbumPostComment,AlbumPostCommentEvent,AlbumPostCommentPage,AlbumPostCommentWrite } from "@/models/library";
import { supabase } from "@/shared/lib/supabaseClient";

export async function getAlbumPostComments(
  userId: string,
  postId: string,
  cursor: AlbumFeedCursor | null,
  signal: AbortSignal,
): Promise<AlbumPostCommentPage> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("get_album_post_comments", {
      p_post_id: postId,
      p_limit: 10,
      ...(cursor
        ? {
            p_before_created_at: cursor.createdAt,
            p_before_id: cursor.id,
          }
        : {}),
    })
    .abortSignal(AbortSignal.any([signal, createSignal()]));

  if (error) throw error;

  const rows = data ?? [];
  const items = rows.slice(0, 10);
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      rows.length > 10 && last
        ? { createdAt: last.created_at, id: last.id }
        : null,
  };
}

export async function writeAlbumPostComment(
  request: AlbumPostCommentWrite,
): Promise<Pick<
  AlbumPostComment,
  "id" | "body" | "edited_at" | "revision"
> | null> {
  await requireUser(request.userId);

  if (request.action === "update") {
    const { data, error } = await supabase
      .rpc("update_album_post_comment", {
        p_post_id: request.postId,
        p_comment_id: request.commentId,
        p_body: request.body,
        p_expected_revision: request.expectedRevision,
      })
      .abortSignal(createSignal());

    if (error) throw error;

    if (
      !data ||
      data.id !== request.commentId ||
      data.user_id !== request.userId ||
      data.post_id !== request.postId
    ) {
      throw new Error("INVALID_RESPONSE");
    }

    return {
      id: data.id,
      body: data.body,
      edited_at: data.edited_at,
      revision: data.revision,
    };
  }

  if (request.action === "save") {
    const { data, error } = await supabase
      .rpc("save_album_post_comment", {
        p_post_id: request.postId,
        p_comment_id: request.commentId,
        p_body: request.body,
      })
      .abortSignal(createSignal());

    if (error) throw error;
    if (data !== request.commentId) {
      throw new Error("INVALID_RESPONSE");
    }
  } else {
    const { data, error } = await supabase
      .rpc("delete_album_post_comment", {
        p_post_id: request.postId,
        p_comment_id: request.commentId,
      })
      .abortSignal(createSignal());

    if (error) throw error;
    if (data !== true) throw new Error("COMMENT_NOT_FOUND");
  }

  return null;
}

type CommentListener = (event: AlbumPostCommentEvent) => void;

type CommentRoom = {
  userId: string;
  listeners: Set<CommentListener>;
  channel: ReturnType<typeof supabase.channel> | null;
  stopped: boolean;
  connected: boolean;
};

let commentRoom: CommentRoom | null = null;

let commentRoomTasks: Promise<unknown> = Promise.resolve();

function stopCommentRoom(room: CommentRoom): void {
  room.stopped = true;
  const channel = room.channel;

  if (channel) {
    commentRoomTasks = commentRoomTasks
      .then(() => supabase.removeChannel(channel))
      .catch(() => undefined);
  }
}

export function watchAlbumPostComments(
  userId: string,
  listener: CommentListener,
): () => void {
  if (!commentRoom || commentRoom.userId !== userId) {
    if (commentRoom) stopCommentRoom(commentRoom);

    const room: CommentRoom = {
      userId,
      listeners: new Set(),
      channel: null,
      stopped: false,
      connected: false,
    };

    commentRoom = room;

    const emit = (event: AlbumPostCommentEvent) => {
      if (!room.stopped) {
        for (const callback of room.listeners) callback(event);
      }
    };

    commentRoomTasks = commentRoomTasks
      .then(async () => {
        if (room.stopped) return;

        await requireUser(userId);
        await supabase.realtime.setAuth();

        if (room.stopped) return;

        room.channel = supabase.channel("groovy:comments", {
          config: { private: true },
        });

        room.channel
          .on(
            "broadcast",
            { event: "comment_changed" },
            ({ payload }: { payload: unknown }) => {
              if (
                typeof payload !== "object" ||
                !payload ||
                !("postId" in payload) ||
                typeof payload.postId !== "string" ||
                !("id" in payload) ||
                typeof payload.id !== "string" ||
                !("kind" in payload) ||
                (payload.kind !== "new" &&
                  payload.kind !== "changed" &&
                  payload.kind !== "removed")
              ) {
                return;
              }

              emit({
                kind: payload.kind,
                postId: payload.postId,
                id: payload.id,
                revision:
                  "revision" in payload &&
                  typeof payload.revision === "number" &&
                  Number.isInteger(payload.revision)
                    ? payload.revision
                    : 0,
              });
            },
          )
          .subscribe((status) => {
            room.connected = status === "SUBSCRIBED";

            if (room.connected) {
              emit({ kind: "connected" });
            } else if (
              ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)
            ) {
              emit({ kind: "offline" });
            }
          });
      })
      .catch(() => emit({ kind: "offline" }));
  }

  const room = commentRoom;
  room.listeners.add(listener);

  if (room.connected) {
    queueMicrotask(() => {
      if (!room.stopped && room.listeners.has(listener)) {
        listener({ kind: "connected" });
      }
    });
  }

  return () => {
    room.listeners.delete(listener);

    if (!room.listeners.size && !room.stopped) {
      stopCommentRoom(room);
      if (commentRoom === room) commentRoom = null;
    }
  };
}
