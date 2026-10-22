export interface ArtistSummary {
  id: string;
  name: string;
}

export interface AlbumSummary {
  id: string;
  name: string;
  artists: readonly ArtistSummary[];
  coverUrl: string | null;
  releaseDate: string | null;
}

export interface AlbumTrack {
  id: string;
  name: string;
  trackNumber: number;
  discNumber: number;
  durationMs: number;
  explicit: boolean;
}

export interface AlbumDetail extends AlbumSummary {
  totalTracks: number;
  spotifyUrl: string;
}

export interface AlbumSearchPage {
  albums: readonly AlbumSummary[];
  nextOffset: number | null;
}

export interface AlbumTrackPage {
  tracks: readonly AlbumTrack[];
  nextOffset: number | null;
}
