import { catalogAlbumSchema } from "@/features/catalog/lib/catalogSchemas";
import { createSignal,requireUser } from "@/features/library/services/libraryService";
import type { AlbumFeedCursor,AlbumPost,FeedAlbum,FeedProfile } from "@/models/library";
import { supabase } from "@/shared/lib/supabaseClient";

export async function getAlbumFeed(
  userId: string,
  cursor: AlbumFeedCursor | null,
  signal: AbortSignal,
  profileId: string | null = null,
  followingOnly = false,
): Promise<{
  items: AlbumPost[];
  nextCursor: AlbumFeedCursor | null;
}> {
  await requireUser(userId);

  const args = {
    p_limit: 10,

    ...(cursor
      ? {
          p_before_created_at: cursor.createdAt,
          p_before_id: cursor.id,
        }
      : {}),
  };

  const request = profileId
    ? supabase.rpc("get_profile_album_feed", {
        ...args,
        p_profile_id: profileId,
      })
    : followingOnly
      ? supabase.rpc("get_following_album_feed", args)
      : supabase.rpc("get_album_feed", args);

  const { data, error } = await request.abortSignal(createSignal(signal));

  if (error) throw error;

  const rows = data ?? [];

  const items: AlbumPost[] = rows.slice(0, 10).map((row) => {
    if (row.visibility !== "community") {
      throw new Error("INVALID_POST_RESPONSE");
    }

    return {
      ...row,
      visibility: "community",
    };
  });

  const last = items.at(-1);

  return {
    items,

    nextCursor:
      rows.length > 10 && last
        ? {
            createdAt: last.updated_at,
            id: last.id,
          }
        : null,
  };
}

export async function getFeedMetadata(
  userId: string,
  profileIds: string[],
  albumIds: string[],
  signal: AbortSignal,
): Promise<{
  profiles: FeedProfile[];
  albums: FeedAlbum[];
}> {
  await requireUser(userId);

  const [profiles, albums] = await Promise.all([
    profileIds.length
      ? supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", profileIds)
          .abortSignal(createSignal(signal))
      : Promise.resolve({
          data: [],
          error: null,
        }),

    albumIds.length
      ? supabase
          .from("album_cache")
          .select("spotify_album_id, name, cover_url, artists")
          .in("spotify_album_id", albumIds)
          .abortSignal(createSignal(signal))
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (profiles.error) {
    throw profiles.error;
  }

  if (albums.error) {
    throw albums.error;
  }

  return {
    profiles: profiles.data ?? [],

    albums: (albums.data ?? []).map((album) => {
      const artists = catalogAlbumSchema.shape.artists.safeParse(album.artists);

      return {
        id: album.spotify_album_id,
        name: album.name,
        coverUrl: album.cover_url,

        artists: artists.success
          ? artists.data.map((artist) => artist.name)
          : [],
      };
    }),
  };
}
