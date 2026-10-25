import type { Database } from "./database";

export type LibraryFilter =
  | "all"
  | "pending"
  | "listened"
  | "rated"
  | "unrated"
  | "reviewed";

export type LibrarySection = "albums" | "likes" | "dislikes";

export type LibraryPageSize = 10 | 20 | 50;

export type LibraryLoadingDirection = "next" | "previous" | null;

export type LibraryRow =
  Database["public"]["Functions"]["get_my_library"]["Returns"][number];

export interface LibraryCursor {
  createdAt: string;
  id: string;
}

export interface LibraryItem {
  id: string;
  spotifyAlbumId: string;
  status: "pending" | "listened";
  rating: number | null;
  hasReview: boolean;
  title: string | null;
  coverUrl: string | null;
  artists: readonly string[];
  metadataAvailable: boolean;
}

export interface LibraryPageResult {
  items: readonly LibraryItem[];
  total: number;
  page: number;
  pageSize: LibraryPageSize;
}

export interface LibraryNavigation {
  userId: string | null;
  cursors: readonly (LibraryCursor | null)[];
}

export interface GetLibraryInput {
  userId: string;
  filter: LibraryFilter;
  page: number;
  pageSize: LibraryPageSize;
  signal: AbortSignal;
}

export interface LibraryFilterOption {
  value: LibraryFilter;
  label: string;
}

export interface LibraryFiltersProps {
  value: LibraryFilter;
  options: readonly LibraryFilterOption[];
  label: string;
  disabled: boolean;
  onChange: (value: LibraryFilter) => void;
}

export interface LibraryCardLabels {
  pending: string;
  listened: string;
  unavailable: string;
  metadataPending: string;
  review: string;
  rating: string;
}

export interface LibraryCardProps {
  item: LibraryItem;
  ratingLabel: string | null;
  labels: LibraryCardLabels;
}

export interface LibraryCardProps {
  item: LibraryItem;
  ratingLabel: string | null;
  labels: LibraryCardLabels;
  onRemove: (item: LibraryItem) => void;
}
