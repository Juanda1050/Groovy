export type SpotifyApiCode =
  | "UNAUTHORIZED"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "SPOTIFY_QUOTA"
  | "SPOTIFY_UNAVAILABLE"
  | "ALBUM_NOT_FOUND"
  | "SERVER_ERROR";

export interface CachedSpotifyToken {
  value: string;
  expiresAt: number;
}

export interface CatalogAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  coverUrl: string | null;
  releaseDate: string | null;
  releaseDatePrecision: "year" | "month" | "day" | null;
  totalTracks: number;
  spotifyUrl: string;
}
