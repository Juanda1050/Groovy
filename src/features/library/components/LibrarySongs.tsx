import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { SongRow } from "@/features/library/components/SongRow";
import { getSongLibrary } from "@/features/library/services/songLibraryService";
import { useMusicPreferences } from "@/features/preferences/hooks/useMusicPreferences";
import type { SongFilter } from "@/models/songLibrary";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface SongView {
  filter: SongFilter;
  pages: Record<SongFilter, number>;
}

function initialView(): SongView {
  return {
    filter: "favorites",
    pages: { favorites: 1, likes: 1, dislikes: 1 },
  };
}

export function LibrarySongs() {
  const { t } = useTranslation("library");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const viewKey = ["songLibraryView", userId] as const;

  const view = useQuery({
    queryKey: viewKey,
    queryFn: initialView,
    initialData: initialView,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const filter = view.data.filter;
  const requestedPage = view.data.pages[filter];

  const query = useQuery({
    queryKey: [
      "musicPreferences",
      userId,
      "track",
      "libraryPage",
      filter,
      requestedPage,
    ],
    enabled: userId !== null,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");
      return getSongLibrary(userId, filter, requestedPage, signal);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const items = query.data?.items ?? [];

  const preferences = useMusicPreferences(
    "track",
    items.map((item) => item.id),
  );

  const total = query.data?.total ?? 0;
  const pageCount = Math.ceil(total / 10);
  const pageNumber = total === 0 ? 0 : (query.data?.page ?? requestedPage);
  const busy = query.isFetching || preferences.saving;

  function changeFilter(next: SongFilter): void {
    if (busy || useAuthStore.getState().user?.id !== userId) return;

    client.setQueryData<SongView>(viewKey, (previous) => ({
      ...(previous ?? initialView()),
      filter: next,
    }));
  }

  function changePage(page: number): void {
    if (
      busy ||
      page < 1 ||
      page > pageCount ||
      useAuthStore.getState().user?.id !== userId
    ) {
      return;
    }

    client.setQueryData<SongView>(viewKey, (previous) => {
      const base = previous ?? initialView();

      return {
        ...base,
        pages: { ...base.pages, [filter]: page },
      };
    });
  }

  return (
    <section aria-busy={busy} className="space-y-5">
      <div
        role="group"
        aria-label={t("sections.trackPreferences")}
        className="flex flex-wrap gap-2"
      >
        {(["favorites", "likes", "dislikes"] as const).map((value) => {
          const Icon =
            value === "favorites"
              ? Star
              : value === "likes"
                ? ThumbsUp
                : ThumbsDown;

          const colors =
            value === "favorites"
              ? "aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:border-primary/30"
              : value === "likes"
                ? "aria-pressed:bg-like/10 aria-pressed:text-like aria-pressed:border-like/30"
                : "aria-pressed:bg-dislike/10 aria-pressed:text-dislike aria-pressed:border-dislike/30";

          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              disabled={busy}
              aria-pressed={filter === value}
              onClick={() => changeFilter(value)}
              className={`min-h-11 gap-2 rounded-full border border-border/60 px-3 text-xs ${colors}`}
            >
              <Icon aria-hidden="true" />
              {t(
                value === "favorites"
                  ? "tracks.favorites"
                  : `sections.${value}`,
              )}
            </Button>
          );
        })}
      </div>

      {!userId ? (
        <p className="text-sm text-muted-foreground">{t("localPreview")}</p>
      ) : query.isPending ? (
        <div role="status" aria-live="polite">
          <div aria-hidden="true" className="divide-y divide-border/40">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 py-3">
                <Skeleton className="size-12 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5 max-w-64" />
                  <Skeleton className="h-3 w-2/5 max-w-40" />
                </div>
              </div>
            ))}
          </div>
          <span className="sr-only">{t("tracks.loading")}</span>
        </div>
      ) : query.isError ? (
        <div role="alert" className="space-y-3 py-6">
          <p className="text-sm text-destructive">{t("error")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              void query.refetch();
            }}
          >
            {t("actions.retry")}
          </Button>
        </div>
      ) : (
        <>
          {query.data?.metadataError && (
            <div role="alert" className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {t("tracks.metadataError")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void query.refetch();
                }}
              >
                {t("actions.retry")}
              </Button>
            </div>
          )}

          {preferences.readError && (
            <div role="alert" className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-destructive">
                {t("tracks.preferenceError")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={preferences.onRetry}
              >
                {t("actions.retry")}
              </Button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-base font-medium">
                {t("tracks.emptyTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("tracks.emptyDescription")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {items.map((item) => (
                <SongRow
                  key={item.id}
                  item={item}
                  preference={
                    preferences.preferences?.[item.id] ?? item.preference
                  }
                  disabled={preferences.disabled || query.isFetching}
                  onChange={(id, action, active) =>
                    preferences.onChange(id, action, active)
                  }
                />
              ))}
            </ul>
          )}

          {total > 0 && (
            <nav
              aria-label={t("pagination.label")}
              className="flex items-center justify-center gap-2 border-t border-border/40 pt-3"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.previous")}
                disabled={pageNumber <= 1 || busy}
                onClick={() => changePage(pageNumber - 1)}
                className="size-11"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span
                role="status"
                aria-live="polite"
                className="min-w-16 text-center text-xs tabular-nums text-muted-foreground"
              >
                {t("pagination.position", {
                  page: pageNumber,
                  total: pageCount,
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("pagination.next")}
                disabled={pageNumber >= pageCount || busy}
                onClick={() => changePage(pageNumber + 1)}
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
