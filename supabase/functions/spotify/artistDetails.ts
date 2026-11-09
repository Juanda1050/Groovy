import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { normalizeArtist } from "./artists.ts";
import { ApiError } from "./http.ts";
import type { Database } from "./models/database.ts";
import { getSpotifyJson } from "./spotifyClient.ts";

const artistSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string().trim().min(1),
  imageUrl: z.url().startsWith("https://").nullable(),
  spotifyUrl: z.url(),
});

const rawIdentitySchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string().trim().min(1),
});

export async function getArtistDetail(
  artistId: string,
  admin: SupabaseClient<Database>,
) {
  const cached = await admin
    .from("artist_cache")
    .select("*")
    .eq("spotify_artist_id", artistId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached.error) {
    throw new ApiError(503, "SERVER_ERROR");
  }

  if (cached.data) {
    const parsed = artistSchema.safeParse({
      id: cached.data.spotify_artist_id,
      name: cached.data.name,
      imageUrl: cached.data.image_url,
      spotifyUrl: `https://open.spotify.com/artist/${artistId}`,
    });

    if (parsed.success && parsed.data.id === artistId) {
      return parsed.data;
    }
  }

  const raw = await getSpotifyJson(`artists/${artistId}`, admin);
  const identity = rawIdentitySchema.safeParse(raw);

  if (!identity.success || identity.data.id !== artistId) {
    throw new ApiError(503, "SPOTIFY_UNAVAILABLE");
  }

  const artist = normalizeArtist(raw);

  if (artist) {
    const now = Date.now();

    const saved = await admin.from("artist_cache").upsert({
      spotify_artist_id: artist.id,
      name: artist.name,
      image_url: artist.imageUrl,
      image_width: artist.imageWidth,
      image_height: artist.imageHeight,
      fetched_at: new Date(now).toISOString(),
      expires_at: new Date(now + 6 * 60 * 60_000).toISOString(),
    });

    if (saved.error) {
      throw new ApiError(503, "SERVER_ERROR");
    }
  }

  return artistSchema.parse({
    id: identity.data.id,
    name: identity.data.name,
    imageUrl: artist?.imageUrl ?? null,
    spotifyUrl: `https://open.spotify.com/artist/${artistId}`,
  });
}
