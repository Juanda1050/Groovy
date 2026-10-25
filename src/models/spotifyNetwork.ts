export type SpotifyLimitCode = "RATE_LIMITED" | "SPOTIFY_QUOTA";

export interface SpotifyNetworkState {
  blockedUntil: number;
  blockedAt: number;
  limitCode: SpotifyLimitCode;
  block: (seconds: number, code: SpotifyLimitCode) => void;
}
