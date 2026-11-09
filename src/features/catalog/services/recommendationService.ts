import { useAuthStore } from "@/features/auth/stores/authStore";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { catalogErrorCodeSchema } from "@/features/catalog/lib/catalogSchemas";
import {
  knownAlbumChangeResultSchema,
  knownAlbumSchema,
  recommendationEventResultSchema,
  recommendationEventSchema,
  recommendationRequestSchema,
  recommendationResponseSchema,
  savedRecommendationSchema,
} from "@/features/catalog/lib/recommendationSchemas";
import {
  getAlbumDetail,
  invokeCatalogFunction,
} from "@/features/catalog/services/spotifyService";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/features/library/lib/libraryErrors";
import { requireUser } from "@/features/library/services/libraryService";
import type {
  AlbumRecommendation,
  KnownAlbumChange,
  KnownAlbumChangeResult,
  KnownAlbumIntent,
  RecommendationEvent,
  RecommendationRequest,
  RecommendationResponse,
} from "@/models/albumRecommendation";
import type { LibraryAlbum } from "@/models/library";
import { supabase } from "@/shared/lib/supabaseClient";

function assertActive(userId: string, signal: AbortSignal): void {
  signal.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new CatalogError("UNAUTHORIZED");
  }
}

function throwRpcError(error: unknown): never {
  const code = getLibraryErrorCode(error);

  if (
    code === "AUTH_REQUIRED" ||
    code === "SESSION_EXPIRED" ||
    code === "UNAUTHORIZED"
  ) {
    throw new CatalogError("UNAUTHORIZED");
  }

  if (code === "RATE_LIMITED") {
    throw new CatalogError("RATE_LIMITED", getLibraryRetrySeconds(error));
  }

  const parsed = catalogErrorCodeSchema.safeParse(code);

  throw new CatalogError(parsed.success ? parsed.data : "SERVER_ERROR");
}

export async function fetchAlbumRecommendation(
  userId: string,
  request: RecommendationRequest,
  signal: AbortSignal,
): Promise<RecommendationResponse> {
  assertActive(userId, signal);

  const input = recommendationRequestSchema.safeParse(request);

  if (!input.success) {
    throw new CatalogError("INVALID_REQUEST");
  }

  const raw = await invokeCatalogFunction(
    "albumRecommendation",
    {
      ...input.data,
      supportsRatedAlbums: true,
    },
    signal,
    45_000,
  );

  assertActive(userId, signal);

  const parsed = recommendationResponseSchema.safeParse(raw);

  if (
    !parsed.success ||
    (parsed.data.state === "ready" &&
      (parsed.data.recommendation.requestId !== request.requestId ||
        parsed.data.recommendation.strategy !== request.strategy))
  ) {
    throw new CatalogError("SERVER_ERROR");
  }

  return parsed.data;
}

export async function recordRecommendationEvent(
  userId: string,
  recommendation: AlbumRecommendation,
  event: RecommendationEvent,
): Promise<void> {
  const signal = AbortSignal.timeout(15_000);

  assertActive(userId, signal);
  await requireUser(userId);
  assertActive(userId, signal);

  const parsedEvent = recommendationEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    throw new CatalogError("INVALID_REQUEST");
  }

  const operation =
    parsedEvent.data === "impression"
      ? supabase.rpc("record_my_recommendation_impression", {
          p_recommendation_id: recommendation.id,
        })
      : supabase.rpc("record_my_recommendation_event", {
          p_recommendation_id: recommendation.id,
          p_event: parsedEvent.data,
        });

  const result = await operation.abortSignal(signal);

  assertActive(userId, signal);

  if (result.error) throwRpcError(result.error);

  const parsed = recommendationEventResultSchema.safeParse(result.data);

  const timestampField = {
    impression: "impressed_at",
    another: "another_at",
    not_interested: "not_interested_at",
    open_spotify: "opened_spotify_at",
  } as const;

  if (
    !parsed.success ||
    parsed.data.id !== recommendation.id ||
    parsed.data.user_id !== userId ||
    parsed.data.spotify_album_id !== recommendation.album.id ||
    parsed.data[timestampField[event]] === null
  ) {
    throw new CatalogError("SERVER_ERROR");
  }
}

export async function saveRecommendedAlbum(
  userId: string,
  recommendation: AlbumRecommendation,
): Promise<LibraryAlbum> {
  const signal = AbortSignal.timeout(30_000);

  assertActive(userId, signal);
  await requireUser(userId);
  assertActive(userId, signal);

  const save = () =>
    supabase
      .rpc("save_my_recommended_album", {
        p_recommendation_id: recommendation.id,
      })
      .abortSignal(signal);

  let result = await save();

  assertActive(userId, signal);

  if (result.error?.message === "ALBUM_METADATA_REQUIRED") {
    await getAlbumDetail(recommendation.album.id, signal);
    assertActive(userId, signal);
    result = await save();
  }

  assertActive(userId, signal);

  if (result.error) throwRpcError(result.error);

  const parsed = savedRecommendationSchema.safeParse(result.data);

  if (
    !parsed.success ||
    parsed.data.recommendationId !== recommendation.id ||
    parsed.data.album.user_id !== userId ||
    parsed.data.album.spotify_album_id !== recommendation.album.id
  ) {
    throw new CatalogError("SERVER_ERROR");
  }

  return parsed.data.album;
}

export async function getKnownAlbumRevision(
  request: KnownAlbumIntent,
): Promise<number> {
  const signal = AbortSignal.timeout(15_000);

  assertActive(request.userId, signal);
  await requireUser(request.userId);
  assertActive(request.userId, signal);

  const result = await supabase
    .from("user_known_albums")
    .select("*")
    .eq("user_id", request.userId)
    .eq("spotify_album_id", request.recommendation.album.id)
    .abortSignal(signal)
    .maybeSingle();

  assertActive(request.userId, signal);

  if (result.error) throwRpcError(result.error);
  if (!result.data) return 0;

  const parsed = knownAlbumSchema.safeParse(result.data);

  if (
    !parsed.success ||
    parsed.data.user_id !== request.userId ||
    parsed.data.spotify_album_id !== request.recommendation.album.id
  ) {
    throw new CatalogError("SERVER_ERROR");
  }

  return parsed.data.revision;
}

export async function setRecommendedAlbumKnown(
  request: KnownAlbumChange,
): Promise<KnownAlbumChangeResult> {
  if (
    !Number.isInteger(request.expectedRevision) ||
    request.expectedRevision < 0 ||
    request.expectedRevision > 2147483647
  ) {
    throw new CatalogError("INVALID_REQUEST");
  }

  const signal = AbortSignal.timeout(15_000);

  assertActive(request.userId, signal);
  await requireUser(request.userId);
  assertActive(request.userId, signal);

  const result = await supabase
    .rpc("set_my_recommended_album_known", {
      p_recommendation_id: request.recommendation.id,
      p_active: request.active,
      p_expected_revision: request.expectedRevision,
    })
    .abortSignal(signal);

  assertActive(request.userId, signal);

  if (result.error) {
    if (result.error.message === "KNOWN_ALBUM_CONFLICT") {
      throw result.error;
    }

    throwRpcError(result.error);
  }

  const parsed = knownAlbumChangeResultSchema.safeParse(result.data);

  if (!parsed.success) {
    throw new CatalogError("SERVER_ERROR");
  }

  const saved = parsed.data.knownAlbum;
  const expectedRevision =
    request.expectedRevision + (parsed.data.changed ? 1 : 0);

  if (
    saved.user_id !== request.userId ||
    saved.spotify_album_id !== request.recommendation.album.id ||
    saved.is_known !== request.active ||
    saved.revision !== expectedRevision ||
    (parsed.data.changed &&
      saved.source_recommendation_id !== request.recommendation.id)
  ) {
    throw new CatalogError("SERVER_ERROR");
  }

  return parsed.data;
}
