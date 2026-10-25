import type { ListeningStatus } from "@/models/catalog";

export interface AlbumRatingProps {
  albumId: string;
}

export interface AlbumRatingRecord {
  rating: number | null;
  status: ListeningStatus;
}

export interface SaveAlbumRatingInput {
  userId: string;
  albumId: string;
  rating: number | null;
}
