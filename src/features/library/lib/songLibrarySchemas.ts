import { z } from "zod";

const spotifyId = z.string().regex(/^[A-Za-z0-9]{22}$/);

export const songFilterSchema = z.enum(["favorites", "likes", "dislikes"]);

export const songLibrarySchema = z.object({
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  page: z.number().int().min(1).max(1_000_000),
  metadataError: z.boolean(),
  items: z
    .array(
      z.object({
        id: spotifyId,
        albumId: spotifyId.nullable(),
        preference: z.object({
          user_id: z.uuid(),
          entity_type: z.literal("track"),
          spotify_id: spotifyId,
          is_favorite: z.boolean(),
          sentiment: z.enum(["like", "dislike"]).nullable(),
          revision: z.number().int().nonnegative(),
          created_at: z.iso.datetime({ offset: true }),
          updated_at: z.iso.datetime({ offset: true }),
        }),
        metadata: z
          .object({
            id: spotifyId,
            name: z.string(),
            artists: z.array(z.string()),
            albumId: spotifyId,
            albumName: z.string(),
            coverUrl: z.url().startsWith("https://").nullable(),
            durationMs: z.number().int().nonnegative(),
          })
          .nullable(),
      }),
    )
    .max(10),
});
