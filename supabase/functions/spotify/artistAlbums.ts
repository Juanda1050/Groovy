import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import { getSpotifyJson } from "./spotifyClient.ts";
import { normalizeAlbum } from "./validation.ts";

const pageSchema = z.object({
  items: z.array(z.unknown()).max(10),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  next: z.string().nullable(),
});

export async function getArtistAlbums(
  artistId: string,
  offset: number,
  market: string,
  userId: string,
  userClient: SupabaseClient<Database>,
  admin: SupabaseClient<Database>,
) {
  const parameters = new URLSearchParams({
    market,
    include_groups: "album",
    limit: "10",
    offset: String(offset),
  });

  const parsed = pageSchema.safeParse(
    await getSpotifyJson(`artists/${artistId}/albums?${parameters}`, admin),
  );

  if (!parsed.success || parsed.data.offset !== offset) {
    throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
  }

  const albums = [
    ...new Map(
      parsed.data.items.map((item) => {
        const album = normalizeAlbum(item);
        return [album.id, album] as const;
      }),
    ).values(),
  ];

  const { data: saved, error } =
    albums.length > 0
      ? await userClient
          .from("user_albums")
          .select("spotify_album_id,status,rating")
          .eq("user_id", userId)
          .in(
            "spotify_album_id",
            albums.map((album) => album.id),
          )
      : { data: [], error: null };

  if (error) throw new ApiError(503, "SERVER_ERROR");

  const savedAlbums = new Map(
    saved?.map((album) => [album.spotify_album_id, album]) ?? [],
  );

  const nextOffset = offset + 10;

  return {
    items: albums.map((album) => {
      const current = savedAlbums.get(album.id);

      return {
        ...album,
        libraryStatus: current?.status ?? null,
        libraryRating: current?.status === "listened" ? current.rating : null,
      };
    }),
    total: parsed.data.total,
    offset,
    limit: 10,
    nextOffset:
      parsed.data.next &&
      nextOffset < parsed.data.total &&
      nextOffset <= 100_000
        ? nextOffset
        : null,
  };
}
