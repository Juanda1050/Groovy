import { supabase } from "@/lib/supabaseClient";

import type {
  AlbumFeedCursor,
  AlbumPostComment,
  AlbumPostCommentEvent,
  AlbumPostCommentPage,
  AlbumPostCommentWrite,
  CommunityAction,
  CommunityPostState,
  LibraryAlbum,
  PublicProfile,
} from "@/models/library";
import type {
  AvatarUploadInput,
  Profile,
  ProfileInput,
  ProfileSearchPage,
  UserSettings,
} from "@/models/profile";
import type { UpdateLanguageInput } from "@/models/language";

const avatarBucket = "avatars";
const avatarMaxBytes = 128 * 1024;
const avatarUrlLifetime = 60 * 60;
const staleUploadAge = 15 * 60_000;

function createSignal(): AbortSignal {
  return AbortSignal.timeout(12_000);
}

async function requireUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function isOwnedAvatarPath(
  userId: string,
  path: string | null,
): path is string {
  return (
    path !== null &&
    path.startsWith(`${userId}/`) &&
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(path)
  );
}

function isDuplicateUpload(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (
    ("statusCode" in error && String(error.statusCode) === "409") ||
    ("status" in error && String(error.status) === "409")
  );
}

async function removeAvatar(path: string): Promise<void> {
  const { error } = await supabase.storage.from(avatarBucket).remove([path]);

  if (error) throw error;
}

async function cleanupStaleAvatars(
  userId: string,
  currentPath: string | null,
  pendingPath: string,
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(avatarBucket)
    .list(userId, {
      limit: 20,
      sortBy: { column: "created_at", order: "asc" },
    });

  if (error || !data) return;

  const cutoff = Date.now() - staleUploadAge;

  const paths = data.flatMap((object) => {
    const path = `${userId}/${object.name}`;
    const createdAt = Date.parse(object.created_at ?? "");

    if (
      !isOwnedAvatarPath(userId, path) ||
      path === currentPath ||
      path === pendingPath ||
      !Number.isFinite(createdAt) ||
      createdAt >= cutoff
    ) {
      return [];
    }

    return [path];
  });

  if (paths.length) {
    await supabase.storage.from(avatarBucket).remove(paths);
  }
}

export async function getProfile(
  userId: string,
  signal: AbortSignal,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return data;
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .rpc("save_profile", {
      p_display_name: input.displayName,
      p_username: input.username,
      p_bio: input.bio,
    })
    .abortSignal(createSignal());

  if (error) throw error;
  return data;
}

export async function getUserSettings(
  userId: string,
  signal: AbortSignal,
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, locale")
    .eq("user_id", userId)
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return data;
}

export async function updateLanguage({
  userId,
  locale,
}: UpdateLanguageInput): Promise<void> {
  const { data, error } = await supabase
    .from("user_settings")
    .update({ locale })
    .eq("user_id", userId)
    .select("user_id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Settings update failed.");
}

export async function getAvatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(avatarBucket)
    .createSignedUrl(path, avatarUrlLifetime);

  if (error) throw error;
  return data.signedUrl;
}

export async function discardProfileAvatar(
  userId: string,
  path: string,
): Promise<Profile> {
  await requireUser(userId);

  const current = await getProfile(userId, createSignal());

  if (current.avatar_url !== path && isOwnedAvatarPath(userId, path)) {
    await removeAvatar(path);
  }

  return current;
}

export async function saveProfileAvatar({
  userId,
  path,
  file,
}: AvatarUploadInput): Promise<Profile> {
  await requireUser(userId);

  if (
    !isOwnedAvatarPath(userId, path) ||
    file.type !== "image/webp" ||
    file.size === 0 ||
    file.size > avatarMaxBytes
  ) {
    throw new Error("AVATAR_INVALID_UPLOAD");
  }

  const previous = await getProfile(userId, createSignal());

  await cleanupStaleAvatars(userId, previous.avatar_url, path).catch(
    () => undefined,
  );

  const { error: uploadError } = await supabase.storage
    .from(avatarBucket)
    .upload(path, file, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError && !isDuplicateUpload(uploadError)) {
    throw uploadError;
  }

  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("save_profile_avatar", { p_avatar_path: path })
    .abortSignal(createSignal());

  let saved = data;

  if (error) {
    const recovered = await getProfile(userId, createSignal()).catch(
      () => null,
    );

    if (recovered?.avatar_url !== path) throw error;
    saved = recovered;
  }

  if (!saved || saved.id !== userId || saved.avatar_url !== path) {
    throw new Error("AVATAR_INVALID_RESPONSE");
  }

  const oldPath = previous.avatar_url;

  if (oldPath !== path && isOwnedAvatarPath(userId, oldPath)) {
    await removeAvatar(oldPath).catch(() => undefined);
  }

  return saved;
}

export async function getCommunitySocial(
  userId: string,
  postIds: string[],
  signal: AbortSignal,
): Promise<CommunityPostState[]> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("get_community_social", { p_post_ids: postIds })
    .abortSignal(AbortSignal.any([signal, createSignal()]));

  if (error) throw error;

  return (data ?? []).map((row) => {
    if (
      row.library_status !== null &&
      row.library_status !== "pending" &&
      row.library_status !== "listened"
    ) {
      throw new Error("INVALID_RESPONSE");
    }

    return { ...row, library_status: row.library_status };
  });
}

export async function getPublicProfile(
  userId: string,
  profileId: string,
  signal: AbortSignal,
): Promise<PublicProfile> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("get_public_profile", { p_profile_id: profileId })
    .abortSignal(AbortSignal.any([signal, createSignal()]))
    .single();

  if (error) throw error;
  if (!data || data.id !== profileId) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return data;
}

export async function setCommunityAction(
  request: CommunityAction,
): Promise<LibraryAlbum | null> {
  await requireUser(request.userId);

  const { data, error } = await supabase
    .rpc("set_community_action", {
      p_action: request.action,
      p_target_id: request.targetId,
      p_active: request.active,
    })
    .abortSignal(createSignal());

  if (error) throw error;
  if (request.action !== "library") return null;

  if (
    !data ||
    data.user_id !== request.userId ||
    (data.status !== "pending" && data.status !== "listened")
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  return { ...data, status: data.status };
}

export async function searchPublicProfiles(
  userId: string,
  query: string,
  signal: AbortSignal,
): Promise<ProfileSearchPage> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("search_public_profiles", {
      p_query: query,
      p_limit: 12,
    })
    .abortSignal(AbortSignal.any([signal, createSignal()]));

  if (error) throw error;

  return {
    items: (data ?? []).slice(0, 12),
    hasMore: (data?.length ?? 0) > 12,
  };
}

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
