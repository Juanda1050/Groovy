import type { z } from "zod";

import type {
  artistPageSchema,
  onboardingArtistSchema,
} from "@/features/preferences/lib/musicOnboardingSchemas";
import type { Database } from "@/models/database";

export type OnboardingArtist = z.infer<typeof onboardingArtistSchema>;

export type OnboardingArtistPage = z.infer<typeof artistPageSchema>;

export type MusicOnboarding =
  Database["public"]["Tables"]["music_onboarding"]["Row"];

export interface OnboardingFavorites {
  albumIds: readonly string[];
  trackIds: readonly string[];
  knownAlbumIds: readonly string[];
}

export interface ArtistCatalogRequest {
  action: "artists";
  query?: string;
  offset?: number;
  seed?: number;
  batch?: number;
}

export interface ArtistBubbleProps {
  artist: OnboardingArtist;
  selected: boolean;
  disabled: boolean;
  onSelect: (artist: OnboardingArtist) => boolean;
  onUnavailable: (id: string, imageUrl: string) => void;
}

export interface SelectedArtistsProps {
  artists: readonly OnboardingArtist[];
  disabled: boolean;
  onRemove: (id: string) => void;
}

export interface OptionalMusicFavoritesProps {
  active: boolean;
  artists: readonly OnboardingArtist[];
  saving: boolean;
  canSubmit: boolean;
  saveError: string | null;
  catalogBlocked: boolean;
  retrySeconds: number;
  onBack: () => void;
  onFinish: (favorites: OnboardingFavorites) => void;
  onCatalogError: (error: unknown) => void;
}
