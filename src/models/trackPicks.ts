import type { AlbumTrackView } from "@/models/albumDetail";
import type { UserTrackPickRow } from "@/models/library";
import type { LibraryPageSize } from "@/models/libraryView";

export type TrackPreference = "favorite" | "least_favorite";

export type TrackPick = Pick<
  UserTrackPickRow,
  "spotify_track_id" | "preference"
>;

export interface SaveTrackPickInput {
  userId: string;
  albumId: string;
  trackId: string;
  preference: TrackPreference | null;
}

export interface GetTrackPicksInput {
  userId: string;
  userAlbumId: string;
  signal: AbortSignal;
}

export interface LibraryTrack {
  userAlbumId: string;
  albumId: string;
  trackId: string;
  preference: TrackPreference;
}

export interface LibraryTrackMetadata {
  albumName: string;
  coverUrl: string | null;
  track: AlbumTrackView;
}

export interface LibraryTrackView extends LibraryTrack {
  metadata: LibraryTrackMetadata | null;
}

export interface GetLibraryTracksInput {
  userId: string;
  preference: TrackPreference;
  page: number;
  pageSize: LibraryPageSize;
  signal: AbortSignal;
}

export interface LibraryTracksPage {
  items: readonly LibraryTrack[];
  total: number;
  page: number;
  pageSize: LibraryPageSize;
}
