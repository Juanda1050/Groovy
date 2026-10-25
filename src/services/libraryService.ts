import { supabase } from "@/lib/supabaseClient";
import { signOut } from "./authService";
import type {
  GetLibraryInput,
  LibraryItem,
  LibraryPageResult,
  LibraryRow,
} from "@/models/libraryView";

const pageSize = 24;

function mapLibraryItem(row: LibraryRow): LibraryItem {
  if (row.status !== "pending" && row.status !== "listened") {
    throw new Error("Invalid library status.");
  }

  return {
    id: row.id,
    spotifyAlbumId: row.spotify_album_id,
    status: row.status,
    rating: row.rating ?? null,
    hasReview: row.has_review,
    title: row.album_name || null,
    coverUrl: row.cover_url || null,
    artists: row.artist_names ?? [],
    metadataAvailable: row.metadata_available,
  };
}

export async function getLibrary({
  filter,
  cursor,
  signal,
}: GetLibraryInput): Promise<LibraryPageResult> {
  const { data, error } = await supabase
    .rpc("get_my_library", {
      p_filter: filter,
      p_limit: pageSize,
      ...(cursor
        ? {
            p_before_created_at: cursor.createdAt,
            p_before_id: cursor.id,
          }
        : {}),
    })
    .abortSignal(signal);

  if (error) {
    if (error.code === "PT401") {
      await signOut();
    }

    throw error;
  }

  const rows = data ?? [];
  const visibleRows = rows.slice(0, pageSize);
  const lastRow = visibleRows.at(-1);

  return {
    items: visibleRows.map(mapLibraryItem),
    nextCursor:
      rows.length > pageSize && lastRow
        ? {
            createdAt: lastRow.created_at,
            id: lastRow.id,
          }
        : null,
  };
}
