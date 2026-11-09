import type { z } from "zod";

import type {
  knownAlbumChangeResultSchema,
  recommendationEventSchema,
  recommendationRequestSchema,
  recommendationResponseSchema,
  recommendationSchema,
} from "@/features/catalog/lib/recommendationSchemas";

export type AlbumRecommendation = z.infer<typeof recommendationSchema>;

export type RecommendationRequest = z.input<typeof recommendationRequestSchema>;

export type RecommendationEvent = z.infer<typeof recommendationEventSchema>;

export type RecommendationResponse = z.infer<
  typeof recommendationResponseSchema
>;

export type RecommendationResult =
  | RecommendationResponse
  | {
      state: "empty";
      reason: "saved" | "known";
    };

export interface RecommendationAction {
  userId: string;
  requestId: string;
  recommendation: AlbumRecommendation;
  kind: "save" | "another" | "not_interested" | "open_spotify";
}

export interface RecommendationImpression {
  userId: string;
  recommendation: AlbumRecommendation;
}

export interface KnownAlbumIntent {
  userId: string;
  requestId: string;
  recommendation: AlbumRecommendation;
}

export interface KnownAlbumChange extends KnownAlbumIntent {
  active: boolean;
  expectedRevision: number;
}

export type KnownAlbumChangeResult = z.infer<
  typeof knownAlbumChangeResultSchema
>;
