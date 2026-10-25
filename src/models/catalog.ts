import type { z } from "zod";
import type {
  catalogAlbumSchema,
  catalogErrorCodeSchema,
  catalogPageSchema,
  savedCatalogAlbumSchema,
} from "@/lib/catalogSchemas";

export type CatalogAlbum = z.infer<typeof catalogAlbumSchema> & {
  libraryRating?: number | null;
};

export type CatalogPage = z.infer<typeof catalogPageSchema>;
export type CatalogErrorCode = z.infer<typeof catalogErrorCodeSchema>;
export type SavedCatalogAlbum = z.infer<typeof savedCatalogAlbumSchema>;

export type CatalogRatings = Record<string, number | null>;

export type CatalogPageSize = 10 | 20 | 50;
export type SpotifySearchPageSize = 5 | 10;

export type ListeningStatus = "pending" | "listened";

export interface SaveCatalogAlbumInput {
  albumId: string;
  status: ListeningStatus;
}

export type CatalogRequest =
  | {
      action: "search";
      query: string;
      offset: number;
      limit?: SpotifySearchPageSize;
    }
  | {
      action: "save";
      albumId: string;
      status: ListeningStatus;
    }
  | {
      action: "detail";
      albumId: string;
    }
  | {
      action: "tracks";
      albumId: string;
      offset: number;
    };

export interface SearchAlbumCardLabels {
  save: string;
  saveListened: string;
  saving: string;
  savedPending: string;
  savedListened: string;
}

export interface SearchAlbumCardProps {
  album: CatalogAlbum;
  labels: SearchAlbumCardLabels;
  disabled: boolean;
  pendingStatus: ListeningStatus | null;
  onSave: (albumId: string, status: ListeningStatus) => void;
}
