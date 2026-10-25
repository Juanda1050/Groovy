import { useAuthStore } from "@/features/auth/stores/authStore";
import { useAlbumReturn } from "@/features/catalog/hooks/useAlbumReturn";
import type { CatalogPage } from "@/models/catalog";
import type { LibraryPageResult } from "@/models/libraryView";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useAlbumRecovery(albumId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const navigation = useAlbumReturn();
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const searchEntries = queryClient.getQueriesData<CatalogPage>({
    queryKey: ["albumSearch", userId],
  });

  const libraryEntries = queryClient.getQueriesData<LibraryPageResult>({
    queryKey: ["library", userId],
  });

  const catalogAlbum = searchEntries
    .flatMap(([, page]) => page?.items ?? [])
    .find((album) => album.id === albumId);

  const libraryAlbum = libraryEntries
    .flatMap(([, page]) => page?.items ?? [])
    .find((album) => album.spotifyAlbumId === albumId);

  const artist = (
    catalogAlbum?.artists[0]?.name ??
    libraryAlbum?.artists[0] ??
    ""
  ).trim();

  const title = (catalogAlbum?.name ?? libraryAlbum?.title ?? "").trim();

  const returnSearch = navigation.returnTo.split("?")[1] ?? "";
  const originalQuery =
    new URLSearchParams(returnSearch).get("q")?.trim() ?? "";

  const recoveryQuery = (artist || title || originalQuery).slice(0, 120);

  const onRecover = useCallback(() => {
    const params = new URLSearchParams();

    if (recoveryQuery) {
      params.set("q", recoveryQuery);
    }

    const search = params.toString();

    navigate(search ? `/?${search}` : "/", {
      replace: true,
    });
  }, [navigate, recoveryQuery]);

  return {
    returnTo: navigation.returnTo,
    returnLabelKey: navigation.returnLabelKey,
    referenceLabel: artist || title || originalQuery,
    recoveryLabelKey: artist
      ? "recovery.searchArtist"
      : recoveryQuery
        ? "recovery.searchAgain"
        : "recovery.openDiscover",
    onRecover,
  };
}
