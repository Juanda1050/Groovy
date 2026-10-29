import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Mic2 } from "lucide-react";
import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { LibraryArtistCard } from "@/features/library/components/LibraryArtistCard";
import { useMusicPreferences } from "@/features/preferences/hooks/useMusicPreferences";
import { getOnboardingArtists } from "@/features/preferences/services/musicOnboardingService";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { SearchInput } from "@/shared/components/SearchInput";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

export function ArtistDiscovery() {
  const { t } = useTranslation(["discover", "library", "common"]);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const inputId = useId();

  const text = (params.get("artistQ") ?? "").slice(0, 120);
  const normalized = text.trim().replace(/\s+/g, " ");
  const debounced = useDebouncedValue(normalized, 400);
  const settling = normalized !== debounced;

  const rawOffset = Number(params.get("artistOffset") ?? 0);
  const offset =
    Number.isInteger(rawOffset) &&
    rawOffset >= 0 &&
    rawOffset <= 990 &&
    rawOffset % 10 === 0
      ? rawOffset
      : 0;

  const search = useQuery({
    queryKey: ["artistSearch", userId, debounced, offset],
    enabled: Boolean(userId) && debounced.length > 0 && !settling,
    queryFn: ({ signal }) => {
      if (!userId) throw new CatalogError("UNAUTHORIZED");

      return getOnboardingArtists(
        userId,
        { action: "artists", query: debounced, offset },
        signal,
      );
    },
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!settling) return;

    void client.cancelQueries({
      queryKey: ["artistSearch", userId],
    });
  }, [client, userId, settling, normalized]);

  const items = !settling && normalized ? (search.data?.items ?? []) : [];
  const preferences = useMusicPreferences(
    "artist",
    items.map((artist) => artist.id),
  );
  const loading = normalized.length > 0 && (settling || search.isPending);
  const nextOffset = search.data?.nextOffset ?? null;

  function changeText(value: string): void {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("artistQ", value.slice(0, 120));
        next.delete("artistOffset");
        return next;
      },
      { replace: true },
    );
  }

  function changePage(nextOffsetValue: number): void {
    if (search.isFetching || settling || preferences.saving) return;

    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("artistOffset", String(nextOffsetValue));
      return next;
    });

    document.getElementById(`${inputId}-results`)?.focus();
  }

  const errorCode =
    search.error instanceof CatalogError ? search.error.code : "SERVER_ERROR";

  return (
    <div className="space-y-6">
      <SearchInput
        id={inputId}
        value={text}
        label={t("artists.search")}
        placeholder={t("artists.placeholder")}
        clearLabel={t("actions.clear")}
        disabled={!userId}
        onValueChange={changeText}
      />

      {!userId ? (
        <p className="text-sm text-muted-foreground">
          {t("artists.signInRequired")}
        </p>
      ) : !normalized ? (
        <div className="flex flex-col items-center border-t border-border/40 px-4 py-14 text-center">
          <Mic2 aria-hidden="true" className="size-10 text-primary/60" />
          <h2 className="mt-4 text-base font-medium">
            {t("artists.initialTitle")}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {t("artists.initialDescription")}
          </p>
        </div>
      ) : (
        <section
          aria-labelledby={`${inputId}-results`}
          aria-busy={loading || search.isFetching}
          className="space-y-5"
        >
          <h2
            id={`${inputId}-results`}
            tabIndex={-1}
            className="flex min-h-9 items-center border-b border-border/40 pb-3 text-sm font-semibold outline-none"
          >
            {t("sections.artists")}
          </h2>

          {loading ? (
            <div role="status" aria-live="polite">
              <PageSkeleton variant="artists" />
              <span className="sr-only">{t("artists.loading")}</span>
            </div>
          ) : search.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{t(`errors.${errorCode}`)}</AlertDescription>
              <Button
                type="button"
                variant="outline"
                disabled={search.isFetching}
                onClick={() => {
                  void search.refetch();
                }}
                className="mt-3 min-h-11"
              >
                {t("actions.retry", { ns: "common" })}
              </Button>
            </Alert>
          ) : (
            <>
              {preferences.readError && (
                <div role="alert" className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-destructive">
                    {t("favorites.loadError", { ns: "library" })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={preferences.onRetry}
                  >
                    {t("actions.retry", { ns: "common" })}
                  </Button>
                </div>
              )}

              {items.length > 0 ? (
                <ul className="grid grid-cols-2 items-start justify-items-center gap-x-6 gap-y-7 px-3 py-4 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-9 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((artist) => (
                    <li key={artist.id} className="w-full">
                      <LibraryArtistCard
                        artist={artist}
                        favorite={
                          preferences.preferences?.[artist.id]?.is_favorite ??
                          false
                        }
                        disabled={preferences.disabled}
                        onFavoriteChange={(id, active) =>
                          preferences.onChange(id, "favorite", active)
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  role="status"
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {t("artists.empty")}
                </p>
              )}

              {(offset > 0 || nextOffset !== null) && (
                <nav
                  aria-label={t("pagination.label")}
                  className="flex items-center justify-center gap-2 pt-5"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("pagination.previous")}
                    disabled={
                      offset === 0 || search.isFetching || preferences.saving
                    }
                    onClick={() => changePage(Math.max(0, offset - 10))}
                    className="size-11"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t("pagination.position", { page: offset / 10 + 1 })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("pagination.next")}
                    disabled={
                      nextOffset === null ||
                      search.isFetching ||
                      preferences.saving
                    }
                    onClick={() => {
                      if (nextOffset !== null) changePage(nextOffset);
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
      )}
    </div>
  );
}
