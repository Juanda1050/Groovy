import type { z } from "zod";
import type {
  albumDetailSchema,
  albumTrackSchema,
  albumTracksPageSchema,
} from "@/lib/albumDetailSchemas";

export type AlbumDetail = z.infer<typeof albumDetailSchema>;
export type AlbumTrack = z.infer<typeof albumTrackSchema>;
export type AlbumTracksPage = z.infer<typeof albumTracksPageSchema>;

export interface AlbumTrackView extends AlbumTrack {
  durationLabel: string;
}

export interface AlbumDetailNavigation {
  albumId: string;
  offsets: readonly number[];
}

export interface AlbumTrackListProps {
  tracks: readonly AlbumTrackView[];
  explicitLabel: string;
  openLabel: string;
}
