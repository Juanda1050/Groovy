import type { z } from "zod";
import type {
  albumDetailSchema,
  albumTrackSchema,
  albumTracksPageSchema,
} from "@/lib/albumDetailSchemas";
import type { ListeningStatus } from "./catalog";

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
  albumId?: string;
  favoritesOnly?: boolean;
}

export interface AlbumStatusProps {
  albumId: string;
}

export type AlbumRatingProps = AlbumStatusProps;
export type AlbumReviewProps = AlbumStatusProps;

export interface AlbumRatingBadgeProps {
  rating: number | null;
}

export interface AlbumStatusBadgeProps {
  status: ListeningStatus;
  label: string;
}

export interface AlbumConfirmationProps {
  open: boolean;
  saving: boolean;
  disabled: boolean;
  errorKey: string | null;
  remainingSeconds: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
