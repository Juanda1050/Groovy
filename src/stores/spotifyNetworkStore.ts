import { create } from "zustand";
import type { SpotifyNetworkState } from "@/models/spotifyNetwork";

export const useSpotifyNetworkStore = create<SpotifyNetworkState>((set) => ({
  blockedUntil: 0,
  blockedAt: 0,
  limitCode: "RATE_LIMITED",

  block: (seconds, code) => {
    const now = Date.now();
    const duration = Number.isFinite(seconds) ? Math.max(1, seconds) : 60;

    set((state) => {
      const until = now + duration * 1000;

      if (until <= state.blockedUntil) return state;

      return {
        blockedUntil: until,
        blockedAt: now,
        limitCode: code,
      };
    });
  },
}));
