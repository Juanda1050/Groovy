import { supabase } from "@/lib/supabaseClient";

import type {
  GetLibraryTracksInput,
  GetTrackPicksInput,
  LibraryTracksPage,
  SaveTrackPickInput,
  TrackPick,
  TrackPreference,
} from "@/models/trackPicks";

const requestTimeout = 12_000;

function createSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(requestTimeout);

  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function requireUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  if (data.session?.user.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function validateTrackPicks(rows: readonly TrackPick[]): TrackPick[] {
  for (const row of rows) {
    if (
      !/^[A-Za-z0-9]{22}$/.test(row.spotify_track_id) ||
      (row.preference !== "favorite" && row.preference !== "least_favorite")
    ) {
      throw new Error("INVALID_TRACK_SELECTION");
    }
  }

  return [...rows];
}

function libraryTracksQuery(
  userId: string,
  preference: TrackPreference,
  head = false,
) {
  return supabase
    .from("user_track_picks")
    .select(
      `
        user_album_id,
        spotify_track_id,
        preference,
        created_at,
        user_albums!inner(user_id, spotify_album_id, status)
      `,
      head ? { count: "exact", head: true } : {},
    )
    .eq("preference", preference)
    .eq("user_albums.user_id", userId)
    .eq("user_albums.status", "listened");
}

export async function getTrackPicks({
  userId,
  userAlbumId,
  signal,
}: GetTrackPicksInput): Promise<TrackPick[]> {
  await requireUser(userId);

  const { data, error } = await supabase
    .from("user_track_picks")
    .select("spotify_track_id, preference, user_albums!inner(user_id)")
    .eq("user_album_id", userAlbumId)
    .eq("user_albums.user_id", userId)
    .abortSignal(createSignal(signal));

  if (error) throw error;

  return validateTrackPicks(data ?? []);
}

export async function saveTrackPick({
  userId,
  albumId,
  trackId,
  preference,
}: SaveTrackPickInput): Promise<TrackPick[]> {
  await requireUser(userId);

  if (!/^[A-Za-z0-9]{22}$/.test(albumId)) {
    throw new Error("INVALID_ALBUM_ID");
  }

  if (!/^[A-Za-z0-9]{22}$/.test(trackId)) {
    throw new Error("INVALID_TRACK_ID");
  }

  const { data, error } = await supabase
    .rpc("set_user_track_pick", {
      p_spotify_album_id: albumId,
      p_spotify_track_id: trackId,
      p_preference: preference as string,
    })
    .abortSignal(createSignal());

  if (error) throw error;

  return validateTrackPicks(data ?? []);
}

export async function getLibraryTracks({
  userId,
  preference,
  page,
  pageSize,
  signal,
}: GetLibraryTracksInput): Promise<LibraryTracksPage> {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    ![10, 20, 50].includes(pageSize) ||
    (preference !== "favorite" && preference !== "least_favorite")
  ) {
    throw new Error("INVALID_PAGINATION");
  }

  await requireUser(userId);

  const countResult = await libraryTracksQuery(
    userId,
    preference,
    true,
  ).abortSignal(createSignal(signal));

  if (countResult.error) throw countResult.error;

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

  const { data, error } = await libraryTracksQuery(userId, preference)
    .order("created_at", { ascending: false })
    .order("user_album_id", { ascending: false })
    .order("spotify_track_id", { ascending: false })
    .range(start, start + pageSize - 1)
    .abortSignal(createSignal(signal));

  if (error) throw error;

  return {
    items: (data ?? []).map((row) => ({
      userAlbumId: row.user_album_id,
      albumId: row.user_albums.spotify_album_id,
      trackId: row.spotify_track_id,
      preference,
    })),
    total,
    page: currentPage,
    pageSize,
  };
}
