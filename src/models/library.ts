import type { ListeningStatus } from "@/models/catalog";
import type { Database } from "@/models/database";

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

export interface DeleteUserAlbumInput {
  action: "delete";
  userId: string;
  albumId: string;
  userAlbumId: string;
}

export interface AlbumPost {
  id: string;
  user_id: string;
  user_album_id: string;
  spotify_album_id: string;
  rating: number | null;
  review: string | null;
  visibility: "community" | "private";
  created_at: string;
  updated_at: string;
  revision: number;
}

export type AlbumRatingRecord = Pick<LibraryAlbum, "rating" | "status">;

export type AlbumReviewRecord = Pick<LibraryAlbum, "review" | "status">;

export type AlbumWriteRequest =
  | (AlbumStatusRequest & {
      action: "status";
    })
  | (SaveAlbumRatingInput & {
      action: "rating";
    })
  | (SaveAlbumReviewInput & {
      action: "review";
    });

export interface AlbumFeedCursor {
  createdAt: string;
  id: string;
}

export interface FeedProfile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface FeedAlbum {
  id: string;
  name: string;
  coverUrl: string | null;
  artists: string[];
}

export interface AlbumFeedItem extends AlbumPost {
  author: FeedProfile | null;
  album: FeedAlbum | null;
}

export interface AlbumFeedPage {
  items: AlbumFeedItem[];
  nextCursor: AlbumFeedCursor | null;
}

export interface CommunityPostState {
  post_id: string;
  reaction_count: number;
  reacted: boolean;
  following_author: boolean;
  library_status: "pending" | "listened" | null;
}

export interface CommunityAction {
  userId: string;
  action: "follow" | "reaction" | "library";
  targetId: string;
  active: boolean;
}

export interface PublicProfile {
  id: string;
  display_name: string;
  username: string | null;
  bio: string;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
  following: boolean;
}

export interface AlbumFeedCardProps {
  variant?: "card" | "profile";
  item: AlbumFeedItem;
  social: CommunityPostState | null;
  viewerId: string | null;
  busy: boolean;
  onProfile: () => void;
  onReaction: () => void;
  onFollow: () => void;
  onSaveAlbum: () => void;
}

export interface PublicProfileDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface AlbumPostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  revision: number;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface AlbumPostCommentPage {
  items: AlbumPostComment[];
  nextCursor: AlbumFeedCursor | null;
}

export type AlbumPostCommentWrite = {
  userId: string;
  postId: string;
  commentId: string;
} & (
  | {
      action: "save";
      body: string;
    }
  | {
      action: "update";
      body: string;
      expectedRevision: number;
    }
  | {
      action: "delete";
    }
);

export type AlbumPostCommentEvent =
  | {
      kind: "connected" | "offline";
    }
  | {
      kind: "new" | "changed" | "removed";
      revision: number;
      postId: string;
      id: string;
    };

export interface AlbumPostCommentsProps {
  postId: string;
  open: boolean;
}

export interface AlbumPostCommentEdit {
  userId: string;
  id: string;
  originalBody: string;
  revision: number;
  value: string;
}
