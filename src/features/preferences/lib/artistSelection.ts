import type { OnboardingArtist } from "@/models/musicOnboarding";

export function uniqueArtists(
  artists: readonly OnboardingArtist[],
): OnboardingArtist[] {
  return [...new Map(artists.map((artist) => [artist.id, artist])).values()];
}

export function addSelectedArtist(
  artists: readonly OnboardingArtist[],
  artist: OnboardingArtist,
): OnboardingArtist[] {
  if (artists.length >= 100 || artists.some((item) => item.id === artist.id)) {
    return [...artists];
  }

  return [...artists, artist];
}
