import { supabase } from "@/lib/supabaseClient";
import { saveCatalogAlbum } from "@/services/spotifyService";
import { useAuthStore } from "@/stores/authStore";
import type { ListeningStatus } from "@/models/catalog";
import type {
  AlbumStatusRequest,
  AlbumStatusResult,
} from "@/models/albumStatus";

function assertCurrentUser(userId: string): void {
  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getAlbumStatus(
  userId: string,
  albumId: string,
  signal: AbortSignal,
): Promise<ListeningStatus | null> {
  assertCurrentUser(userId);

  const { data, error } = await supabase
    .from("user_albums")
    .select("status")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(signal)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  if (data.status !== "pending" && data.status !== "listened") {
    throw new Error("INVALID_STATUS");
  }

  return data.status;
}

export async function changeAlbumStatus({
  albumId,
  userId,
  status,
  isNew,
}: AlbumStatusRequest): Promise<AlbumStatusResult> {
  assertCurrentUser(userId);

  if (isNew) {
    const saved = await saveCatalogAlbum({ albumId, status });

    return {
      spotifyAlbumId: saved.spotifyAlbumId,
      status: saved.status,
    };
  }

  const { data, error } = await supabase.rpc("save_user_album", {
    p_spotify_album_id: albumId,
    p_status: status,
    p_favorite_track_ids: [],
    p_least_favorite_track_ids: [],
  });

  if (error) throw error;

  if (
    !data ||
    data.user_id !== userId ||
    data.spotify_album_id !== albumId ||
    (data.status !== "pending" && data.status !== "listened")
  ) {
    throw new Error("INVALID_SAVE_RESPONSE");
  }

  return {
    spotifyAlbumId: data.spotify_album_id,
    status: data.status,
  };
}
