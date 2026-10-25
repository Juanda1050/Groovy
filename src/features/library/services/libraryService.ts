import { catalogAlbumSchema } from "@/features/catalog/lib/catalogSchemas";
import { saveCatalogAlbum } from "@/features/catalog/services/spotifyService";
import { countReviewCharacters,normalizeReview,reviewMaxLength,validateReviewLanguage } from "@/features/library/lib/reviewText";
import type { CatalogRatings } from "@/models/catalog";
import type { AlbumWriteRequest,DeleteUserAlbumInput,LibraryAlbum,SaveUserAlbumArgs,UserAlbumRow } from "@/models/library";
import type { GetLibraryInput,LibraryFilter,LibraryPageResult } from "@/models/libraryView";
import { supabase } from "@/shared/lib/supabaseClient";

const requestTimeout = 12_000;

export function createSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(requestTimeout);

  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function requireUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  if (data.session?.user.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function validateAlbumId(albumId: string): void {
  if (!/^[A-Za-z0-9]{22}$/.test(albumId)) {
    throw new Error("INVALID_ALBUM_ID");
  }
}

function mapUserAlbum(
  row: UserAlbumRow,
  userId: string,
  albumId: string,
): LibraryAlbum {
  if (row.user_id !== userId || row.spotify_album_id !== albumId) {
    throw new Error("INVALID_ALBUM_RESPONSE");
  }

  if (row.status !== "pending" && row.status !== "listened") {
    throw new Error("INVALID_STATUS");
  }

  return {
    ...row,
    status: row.status,
  };
}

function libraryQuery(userId: string, filter: LibraryFilter, head = false) {
  let query = supabase
    .from("user_albums")
    .select(
      "*",
      head
        ? {
            count: "exact",
            head: true,
          }
        : {},
    )
    .eq("user_id", userId);

  switch (filter) {
    case "pending":
    case "listened":
      query = query.eq("status", filter);
      break;

    case "rated":
      query = query.not("rating", "is", null);
      break;

    case "unrated":
      query = query.eq("status", "listened").is("rating", null);
      break;

    case "reviewed":
      query = query.filter("review", "match", "[^ ]");
      break;
  }

  return query;
}

function validateRating(rating: number | null): void {
  if (
    rating !== null &&
    (!Number.isFinite(rating) ||
      rating < 1 ||
      rating > 10 ||
      !Number.isInteger(rating * 2))
  ) {
    throw new Error("INVALID_RATING");
  }
}

async function persistAlbum(
  userId: string,
  albumId: string,
  args: SaveUserAlbumArgs,
): Promise<LibraryAlbum> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("save_user_album", args)
    .abortSignal(createSignal());

  if (error) throw error;

  if (!data) {
    throw new Error("INVALID_SAVE_RESPONSE");
  }

  const saved = mapUserAlbum(data, userId, albumId);

  if (saved.status !== args.p_status) {
    throw new Error("INVALID_SAVE_RESPONSE");
  }

  return saved;
}

export async function getLibrary({
  userId,
  filter,
  page,
  pageSize,
  signal,
}: GetLibraryInput): Promise<LibraryPageResult> {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    ![10, 20, 50].includes(pageSize)
  ) {
    throw new Error("INVALID_PAGINATION");
  }

  await requireUser(userId);

  const countResult = await libraryQuery(userId, filter, true).abortSignal(
    createSignal(signal),
  );

  if (countResult.error) {
    throw countResult.error;
  }

  const total = countResult.count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, lastPage);

  if (total === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
    };
  }

  const start = (currentPage - 1) * pageSize;

  const { data, error } = await libraryQuery(userId, filter)
    .order("created_at", {
      ascending: false,
    })
    .order("id", {
      ascending: false,
    })
    .range(start, start + pageSize - 1)
    .abortSignal(createSignal(signal));

  if (error) throw error;

  const rows = data ?? [];

  if (rows.length === 0) {
    return {
      items: [],
      total,
      page: currentPage,
      pageSize,
    };
  }

  const { data: metadata, error: metadataError } = await supabase
    .from("album_cache")
    .select("spotify_album_id, name, cover_url, artists")
    .in(
      "spotify_album_id",
      rows.map((album) => album.spotify_album_id),
    )
    .abortSignal(createSignal(signal));

  if (metadataError) {
    throw metadataError;
  }

  const albums = new Map(
    (metadata ?? []).map((album) => [album.spotify_album_id, album]),
  );

  return {
    items: rows.map((row) => {
      const album = mapUserAlbum(row, userId, row.spotify_album_id);

      const cached = albums.get(row.spotify_album_id);

      const artists = catalogAlbumSchema.shape.artists.safeParse(
        cached?.artists,
      );

      return {
        id: album.id,
        spotifyAlbumId: album.spotify_album_id,
        status: album.status,
        rating: album.rating,
        hasReview: Boolean(album.review?.trim()),
        title: cached?.name ?? null,
        coverUrl: cached?.cover_url ?? null,

        artists: artists.success
          ? artists.data.map((artist) => artist.name)
          : [],

        metadataAvailable: Boolean(cached),
      };
    }),

    total,
    page: currentPage,
    pageSize,
  };
}

export async function getUserAlbum(
  userId: string,
  albumId: string,
  signal?: AbortSignal,
): Promise<LibraryAlbum | null> {
  validateAlbumId(albumId);
  await requireUser(userId);

  const { data, error } = await supabase
    .from("user_albums")
    .select("*")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createSignal(signal))
    .maybeSingle();

  if (error) throw error;

  return data ? mapUserAlbum(data, userId, albumId) : null;
}

export async function getCatalogRatings(
  userId: string,
  albumIds: readonly string[],
  signal: AbortSignal,
): Promise<CatalogRatings> {
  await requireUser(userId);

  const ids = [...new Set(albumIds)];

  const ratings: CatalogRatings = Object.fromEntries(
    ids.map((id) => [id, null]),
  );

  if (ids.length === 0) {
    return ratings;
  }

  const { data, error } = await supabase
    .from("user_albums")
    .select("spotify_album_id, rating")
    .eq("user_id", userId)
    .eq("status", "listened")
    .in("spotify_album_id", ids)
    .abortSignal(createSignal(signal));

  if (error) throw error;

  for (const album of data ?? []) {
    ratings[album.spotify_album_id] = album.rating;
  }

  return ratings;
}

export async function saveUserAlbum(
  request: AlbumWriteRequest,
): Promise<LibraryAlbum> {
  const { userId, albumId } = request;

  validateAlbumId(albumId);
  await requireUser(userId);

  if (request.action === "status") {
    if (request.isNew) {
      await saveCatalogAlbum({
        albumId,
        status: request.status,
      });

      const saved = await getUserAlbum(userId, albumId);

      if (!saved) {
        throw new Error("INVALID_SAVE_RESPONSE");
      }

      return saved;
    }

    const current = await getUserAlbum(userId, albumId);

    if (!current) {
      throw new Error("ALBUM_NOT_SAVED");
    }

    if (current.status === request.status) {
      return current;
    }

    return persistAlbum(userId, albumId, {
      p_spotify_album_id: albumId,
      p_status: request.status,
      p_favorite_track_ids: [],
      p_least_favorite_track_ids: [],
    });
  }

  let normalizedReview: string | undefined;

  if (request.action === "rating") {
    validateRating(request.rating);
  } else {
    normalizedReview = normalizeReview(request.review);

    if (countReviewCharacters(normalizedReview) > reviewMaxLength) {
      throw new Error("REVIEW_TOO_LONG");
    }

    await validateReviewLanguage(normalizedReview, request.language);
  }

  await requireUser(userId);

  const { data: current, error } = await supabase
    .from("user_albums")
    .select("*, user_track_picks(spotify_track_id, preference)")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createSignal())
    .maybeSingle();

  if (error) throw error;

  if (!current) {
    throw new Error("ALBUM_NOT_SAVED");
  }

  const album = mapUserAlbum(current, userId, albumId);

  if (album.status !== "listened") {
    throw new Error("ALBUM_NOT_LISTENED");
  }

  const favoriteTrackIds: string[] = [];
  const leastFavoriteTrackIds: string[] = [];

  for (const pick of current.user_track_picks) {
    if (pick.preference === "favorite") {
      favoriteTrackIds.push(pick.spotify_track_id);
    } else if (pick.preference === "least_favorite") {
      leastFavoriteTrackIds.push(pick.spotify_track_id);
    } else {
      throw new Error("INVALID_TRACK_SELECTION");
    }
  }

  const rating = request.action === "rating" ? request.rating : album.rating;

  const review =
    request.action === "review" ? normalizedReview || null : album.review;

  return persistAlbum(userId, albumId, {
    p_spotify_album_id: albumId,
    p_status: "listened",
    p_favorite_track_ids: favoriteTrackIds,
    p_least_favorite_track_ids: leastFavoriteTrackIds,

    ...(rating !== null
      ? {
          p_rating: rating,
        }
      : {}),

    ...(review !== null
      ? {
          p_review: review,
        }
      : {}),

    ...(album.listened_at !== null
      ? {
          p_listened_at: album.listened_at,
        }
      : {}),
  });
}

export async function deleteUserAlbum(
  request: DeleteUserAlbumInput,
): Promise<boolean> {
  validateAlbumId(request.albumId);
  await requireUser(request.userId);

  const { data, error } = await supabase
    .rpc("delete_user_album", {
      p_user_album_id: request.userAlbumId,
    })
    .abortSignal(createSignal());

  if (!error && data === true) {
    return true;
  }

  if (
    error &&
    (error.code === "PT401" ||
      error.code === "28000" ||
      error.code === "42501" ||
      error.message === "RATE_LIMITED")
  ) {
    throw error;
  }

  const session = await supabase
    .rpc("touch_groovy_session")
    .abortSignal(createSignal());

  if (session.error || session.data !== true) {
    throw error ?? session.error ?? new Error("SESSION_EXPIRED");
  }

  const current = await getUserAlbum(request.userId, request.albumId);

  if (current === null) {
    return true;
  }

  throw error ?? new Error("ALBUM_NOT_DELETED");
}
