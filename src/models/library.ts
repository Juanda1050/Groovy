import type { Database } from "./database";
import type { ListeningStatus } from "./catalog";

export type AlbumRating =
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 3.5
  | 4
  | 4.5
  | 5
  | 5.5
  | 6
  | 6.5
  | 7
  | 7.5
  | 8
  | 8.5
  | 9
  | 9.5
  | 10;

export type ReviewLanguage = "en" | "es";

export type UserAlbumRow = Database["public"]["Tables"]["user_albums"]["Row"];

export type UserTrackPickRow =
  Database["public"]["Tables"]["user_track_picks"]["Row"];

export type SaveUserAlbumArgs =
  Database["public"]["Functions"]["save_user_album"]["Args"];

export type LibraryAlbum = Omit<UserAlbumRow, "status"> & {
  status: ListeningStatus;
};

export interface PendingAlbumInput {
  spotifyAlbumId: string;
  status: "pending";
  rating: null;
  review: null;
  listenedAt: null;
  favoriteTrackIds: readonly [];
  leastFavoriteTrackIds: readonly [];
}

export interface ListenedAlbumInput {
  spotifyAlbumId: string;
  status: "listened";
  rating: AlbumRating | null;
  review: string | null;
  listenedAt: string | null;
  favoriteTrackIds: readonly string[];
  leastFavoriteTrackIds: readonly string[];
}

export type SaveAlbumInput = PendingAlbumInput | ListenedAlbumInput;

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

export interface SaveAlbumRatingInput {
  userId: string;
  albumId: string;
  rating: number | null;
}

export interface SaveAlbumReviewInput {
  userId: string;
  albumId: string;
  review: string;
  language: ReviewLanguage;
}

export type AlbumRatingRecord = Pick<LibraryAlbum, "rating" | "status">;

export type AlbumReviewRecord = Pick<LibraryAlbum, "review" | "status">;

export type AlbumWriteRequest =
  | (AlbumStatusRequest & { action: "status" })
  | (SaveAlbumRatingInput & { action: "rating" })
  | (SaveAlbumReviewInput & { action: "review" });
