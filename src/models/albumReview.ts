import type { ComponentProps } from "react";
import type { ListeningStatus } from "@/models/catalog";

export type TextareaProps = ComponentProps<"textarea">;

export type ReviewLanguage = "en" | "es";

export interface AlbumReviewProps {
  albumId: string;
}

export interface AlbumReviewRecord {
  status: ListeningStatus;
  review: string | null;
}

export interface SaveAlbumReviewInput {
  userId: string;
  albumId: string;
  review: string;
  language: ReviewLanguage;
}
