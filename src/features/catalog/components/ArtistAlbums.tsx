import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";

import { toast } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { SearchAlbumCard } from "@/features/catalog/components/SearchAlbumCard";
import {
  albumLibraryKey,
  syncCatalogAlbumStatus,
} from "@/features/catalog/lib/albumQueries";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { getArtistAlbums } from "@/features/catalog/services/artistService";
import { saveCatalogAlbum } from "@/features/catalog/services/spotifyService";
import type { ArtistAlbumPage, ListeningStatus } from "@/models/catalog";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Button } from "@/shared/components/ui/button";

export function ArtistAlbums({ artistId }: { artistId: string }) {
  const { t } = useTranslation(["discover", "common"]);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const headingId = useId();

  const rawOffset = Number(params.get("offset") ?? 0);
  const offset =
    Number.isInteger(rawOffset) &&
    rawOffset >= 0 &&
    rawOffset <= 100_000 &&
    rawOffset % 10 === 0
      ? rawOffset
      : 0;

  const prefix = ["artistAlbums", userId];
  const writeKey = ["artistAlbumSave", userId];

  const query = useQuery({
    queryKey: [...prefix, artistId, offset],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => {
      if (!userId) throw new CatalogError("UNAUTHORIZED");
      return getArtistAlbums(userId, artistId, offset, signal);
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const save = useMutation({
    mutationKey: writeKey,
    mutationFn: saveCatalogAlbum,
    retry: false,

    onMutate: () => client.cancelQueries({ queryKey: prefix }),

    onSuccess: (saved) => {
      if (!userId || useAuthStore.getState().user?.id !== userId) return;

      syncCatalogAlbumStatus(
        client,
        userId,
        saved.spotifyAlbumId,
        saved.status,
      );

      client.setQueriesData<ArtistAlbumPage>(
        { queryKey: prefix },
        (previous) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((album) =>
                  album.id === saved.spotifyAlbumId
                    ? {
                        ...album,
                        libraryStatus: saved.status,
                        libraryRating: null,
                      }
                    : album,
                ),
              }
            : previous,
      );

      void client.invalidateQueries({
        queryKey: albumLibraryKey(userId, saved.spotifyAlbumId),
        refetchType: "none",
      });

      void client.invalidateQueries({
        queryKey: ["library", userId],
        refetchType: "none",
      });

      toast.add({
        type: "success",
        title: t("notifications.saved", { ns: "common" }),
        timeout: 2600,
      });
    },

    onError: (error) => {
      if (useAuthStore.getState().user?.id !== userId) return;

      toast.add({
        type: "error",
        title: t(
          `errors.${error instanceof CatalogError ? error.code : "SERVER_ERROR"}`,
        ),
        timeout: 5000,
      });
    },
  });

  const labels = {
    save: t("actions.save"),
    saveListened: t("actions.saveListened"),
    saving: t("actions.saving"),
    savedPending: t("saved.pending"),
    savedListened: t("saved.listened"),
  };

  function onSave(albumId: string, status: ListeningStatus): void {
    if (
      !userId ||
      useAuthStore.getState().user?.id !== userId ||
      client.isMutating({ mutationKey: writeKey }) > 0 ||
      !query.data?.items.some((album) => album.id === albumId)
    ) {
      return;
    }

    save.mutate({ albumId, status });
  }

  function changePage(nextOffset: number): void {
    if (query.isFetching || save.isPending) return;

    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextOffset === 0) next.delete("offset");
        else next.set("offset", String(nextOffset));
        return next;
      },
      { state: location.state },
    );

    document.getElementById(headingId)?.focus();
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={query.isFetching || save.isPending}
      className="space-y-5 border-t border-border/40 pt-6"
    >
      <h2
        id={headingId}
        tabIndex={-1}
        className="text-base font-semibold outline-none"
      >
        {t("sections.albums")}
      </h2>

      {query.isPending ? (
        <div role="status" aria-live="polite">
          <PageSkeleton variant="albums" />
          <span className="sr-only">{t("loading")}</span>
        </div>
      ) : query.isError ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-destructive">
            {t("artistDetail.albumsError")}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            {t("actions.retry", { ns: "common" })}
          </Button>
        </div>
      ) : (
        <>
          {query.data.items.length > 0 ? (
            <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5">
              {query.data.items.map((album) => (
                <SearchAlbumCard
                  key={album.id}
                  album={album}
                  labels={labels}
                  disabled={save.isPending}
                  pendingStatus={
                    save.isPending && save.variables.albumId === album.id
                      ? save.variables.status
                      : null
                  }
                  onSave={onSave}
                />
              ))}
            </div>
          ) : (
            <p
              role="status"
              className="py-10 text-center text-sm text-muted-foreground"
            >
              {t("artistDetail.noAlbums")}
            </p>
          )}

          {(offset > 0 || query.data.nextOffset !== null) && (
            <nav
              aria-label={t("pagination.label")}
              className="flex items-center justify-center gap-2 pt-3"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.previous")}
                disabled={offset === 0 || query.isFetching || save.isPending}
                onClick={() => changePage(Math.max(0, offset - 10))}
                className="size-11"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span
                role="status"
                aria-live="polite"
                className="min-w-16 text-center text-xs tabular-nums text-muted-foreground"
              >
                {t("pagination.position", { page: offset / 10 + 1 })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.next")}
                disabled={
                  query.data.nextOffset === null ||
                  query.isFetching ||
                  save.isPending
                }
                onClick={() => {
                  if (query.data.nextOffset !== null) {
                    changePage(query.data.nextOffset);
                  }
                }}
                className="size-11"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
