import { z } from "zod";

const spotifyIdSchema = z.string().regex(/^[A-Za-z0-9]{22}$/);

export const musicEntityTypeSchema = z.enum(["artist", "album", "track"]);

export const musicPreferenceIdsSchema = z.array(spotifyIdSchema).max(100);

export const musicPreferenceSchema = z
  .object({
    user_id: z.uuid(),
    entity_type: musicEntityTypeSchema,
    spotify_id: spotifyIdSchema,
    sentiment: z.enum(["like", "dislike"]).nullable(),
    is_favorite: z.boolean(),
    revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .refine((row) => row.entity_type === "track" || row.sentiment === null)
  .refine(
    (row) =>
      row.entity_type !== "track" ||
      !row.is_favorite ||
      row.sentiment === "like",
  );

export const setMusicPreferenceSchema = z
  .object({
    userId: z.uuid(),
    entityType: musicEntityTypeSchema,
    spotifyId: spotifyIdSchema,
    action: z.enum(["favorite", "like", "dislike"]),
    active: z.boolean(),
    expectedRevision: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
  })
  .refine(
    (input) => input.entityType === "track" || input.action === "favorite",
  );
