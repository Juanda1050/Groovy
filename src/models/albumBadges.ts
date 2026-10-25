import type { ListeningStatus } from "@/models/catalog";

export interface AlbumRatingBadgeProps {
  rating: number | null;
}

export interface AlbumStatusBadgeProps {
  status: ListeningStatus;
  label: string;
}
