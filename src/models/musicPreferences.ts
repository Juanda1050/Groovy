import type { Database } from "@/models/database";

export type MusicEntityType = "artist" | "album" | "track";

export type MusicPreferenceAction = "favorite" | "like" | "dislike";

type MusicPreferenceRow =
  Database["public"]["Tables"]["user_music_preferences"]["Row"];

export type MusicPreference = Omit<
  MusicPreferenceRow,
  "entity_type" | "sentiment"
> & {
  entity_type: MusicEntityType;
  sentiment: "like" | "dislike" | null;
};

export type MusicPreferenceBatch = Record<string, MusicPreference | null>;

export interface GetMusicPreferencesInput {
  userId: string;
  entityType: MusicEntityType;
  spotifyIds: readonly string[];
  signal: AbortSignal;
}

export interface SetMusicPreferenceInput {
  userId: string;
  entityType: MusicEntityType;
  spotifyId: string;
  action: MusicPreferenceAction;
  active: boolean;
  expectedRevision: number;
}
