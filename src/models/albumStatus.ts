import type { ListeningStatus } from "@/models/catalog";

export interface AlbumStatusProps {
  albumId: string;
}

export interface AlbumStatusRequest {
  albumId: string;
  userId: string;
  status: ListeningStatus;
  isNew: boolean;
}

export interface AlbumStatusResult {
  spotifyAlbumId: string;
  status: ListeningStatus;
}
