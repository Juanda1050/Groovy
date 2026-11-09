import { z } from "zod";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAlbumMetadata } from "@/features/catalog/services/albumMetadataService";
import {
  createSignal,
  requireUser,
} from "@/features/library/services/libraryService";
import type { GetLibraryInput, LibraryPageResult } from "@/models/libraryView";
import { supabase } from "@/shared/lib/supabaseClient";

const collectionSchema = z.object({
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  page: z.number().int().positive().max(1_000_000),
  pageSize: z.literal(10),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        spotifyAlbumId: z.string().regex(/^[A-Za-z0-9]{22}$/),
        status: z.enum(["pending", "listened"]).nullable(),
        rating: z.number().finite().nullable(),
        hasReview: z.boolean(),
      }),
    )
    .max(10),
});

function assertActive(userId: string, signal: AbortSignal): void {
  signal.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getLibraryAlbumCollection({
  userId,
  filter,
  page,
  pageSize,
  signal,
}: GetLibraryInput): Promise<LibraryPageResult> {
  if (
    (filter !== "all" && filter !== "favorites") ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1_000_000 ||
    pageSize !== 10
  ) {
    throw new Error("INVALID_PAGINATION");
  }

  const requestSignal = createSignal(signal);

  assertActive(userId, requestSignal);
  await requireUser(userId);
  assertActive(userId, requestSignal);

  const { data, error } = await supabase
    .rpc("get_my_album_collection", {
      p_filter: filter,
      p_page: page,
    })
    .abortSignal(requestSignal);

  assertActive(userId, requestSignal);

  if (error) throw error;

  const parsed = collectionSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("INVALID_LIBRARY_RESPONSE");
  }

  const collection = parsed.data;
  const lastPage = Math.max(1, Math.ceil(collection.total / 10));
  const expectedPage = Math.min(page, lastPage);
  const expectedCount = Math.min(
    10,
    Math.max(0, collection.total - (expectedPage - 1) * 10),
  );

  const ids = collection.items.map((item) => item.spotifyAlbumId);

  if (
    collection.page !== expectedPage ||
    collection.items.length !== expectedCount ||
    new Set(ids).size !== ids.length ||
    collection.items.some(
      (item) =>
        item.status === null && (item.rating !== null || item.hasReview),
    )
  ) {
    throw new Error("INVALID_LIBRARY_RESPONSE");
  }

  if (ids.length === 0) {
    return {
      items: [],
      total: collection.total,
      page: collection.page,
      pageSize: 10,
    };
  }

  const metadata = await getAlbumMetadata(userId, ids, requestSignal);

  assertActive(userId, requestSignal);

  const albums = new Map(metadata.map((album) => [album.id, album]));

  return {
    items: collection.items.map((item) => {
      const album = albums.get(item.spotifyAlbumId);

      return {
        ...item,
        title: album?.name ?? null,
        coverUrl: album?.coverUrl ?? null,
        artists: album?.artists ?? [],
        metadataAvailable: Boolean(album),
      };
    }),
    total: collection.total,
    page: collection.page,
    pageSize: 10,
  };
}
