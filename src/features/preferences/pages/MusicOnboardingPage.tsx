import { ArrowRight, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { ArtistBubble } from "@/features/preferences/components/ArtistBubble";
import { OptionalMusicFavorites } from "@/features/preferences/components/OptionalMusicFavorites";
import { SelectedArtists } from "@/features/preferences/components/SelectedArtists";
import { useArtistOnboarding } from "@/features/preferences/hooks/useArtistOnboarding";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

export default function MusicOnboardingPage() {
  const { t } = useTranslation("common");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const form = useArtistOnboarding();

  const [step, setStep] = useState<{
    userId: string | null;
    optional: boolean;
  }>({
    userId,
    optional: false,
  });

  const optionalVisible = step.userId === userId && step.optional;

  const preferredGenre = useDebouncedValue(
    form.selected.at(-1)?.genres[0] ?? null,
    850,
  );

  const search = form.search.trim();
  const viewKey = JSON.stringify([search, search ? null : preferredGenre]);

  const [view, setView] = useState({ key: "", count: 15 });
  const visibleCount = view.key === viewKey ? view.count : 15;

  const selectedIds = new Set(form.selected.map((artist) => artist.id));

  const orderedArtists =
    !search && preferredGenre
      ? [
          ...form.artists.filter((artist) =>
            artist.genres.includes(preferredGenre),
          ),
          ...form.artists.filter(
            (artist) => !artist.genres.includes(preferredGenre),
          ),
        ]
      : form.artists;

  const available = orderedArtists.filter(
    (artist) => !selectedIds.has(artist.id),
  );

  const visibleArtistIds = new Set(
    available.slice(0, visibleCount).map((artist) => artist.id),
  );

  const displayedArtists = orderedArtists.filter(
    (artist) => selectedIds.has(artist.id) || visibleArtistIds.has(artist.id),
  );

  const hasBufferedArtists = available.length > visibleCount;
  const canShowMore = hasBufferedArtists || form.hasMore;
  const initialLoading = form.loading && form.artists.length === 0;

  function showMore(): void {
    if (form.saving) {
      return;
    }

    if (!hasBufferedArtists && (form.catalogBlocked || form.loading)) {
      return;
    }

    const nextCount = visibleCount + 15;

    setView({ key: viewKey, count: nextCount });

    if (
      available.length < nextCount + 10 &&
      form.hasMore &&
      !form.catalogBlocked &&
      !form.loading
    ) {
      form.onMore();
    }
  }

  function continueToFavorites(): void {
    if (
      !userId ||
      form.selected.length < 3 ||
      form.saving ||
      useAuthStore.getState().user?.id !== userId
    ) {
      return;
    }

    setStep({ userId, optional: true });
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div hidden={optionalVisible}>
        <header className="mx-auto max-w-lg space-y-6 text-center">
          <h1
            id="musicOnboardingTitle"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("musicOnboarding.title")}
          </h1>

          <p id="musicOnboardingInstructions" className="sr-only">
            {t("musicOnboarding.description")}
          </p>

          <div className="relative mx-auto max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              id="musicArtistSearch"
              type="search"
              value={form.search}
              maxLength={120}
              disabled={form.saving}
              onChange={(event) => form.onSearch(event.currentTarget.value)}
              autoComplete="off"
              aria-label={t("musicOnboarding.search")}
              placeholder={t("musicOnboarding.searchPlaceholder")}
              className="min-h-11! rounded-full border-border/60 bg-card/50 py-2! pl-11! pr-4! text-sm! focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </header>

        {form.selected.length > 0 && (
          <div className="mt-7">
            <SelectedArtists
              artists={form.selected}
              disabled={form.saving}
              onRemove={form.onRemove}
            />
          </div>
        )}

        <div aria-busy={form.loading} className="mt-8 sm:mt-10">
          {initialLoading ? (
            <div
              role="status"
              className="flex min-h-64 items-center justify-center"
            >
              <RecordLoader size="lg" />
              <span className="sr-only">{t("musicOnboarding.loading")}</span>
            </div>
          ) : (
            <div
              data-artist-grid
              aria-label={t("musicOnboarding.available")}
              className="grid grid-cols-2 items-start justify-items-center gap-x-6 gap-y-9 px-2 py-4 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-11 sm:px-4 md:grid-cols-4 xl:grid-cols-5 xl:gap-x-10"
            >
              {displayedArtists.map((artist) => (
                <ArtistBubble
                  key={artist.id}
                  artist={artist}
                  selected={selectedIds.has(artist.id)}
                  disabled={form.saving || form.atLimit}
                  onSelect={form.onSelect}
                  onUnavailable={form.onUnavailable}
                />
              ))}
            </div>
          )}

          {!form.loading &&
            !form.readError &&
            !form.catalogBlocked &&
            available.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("musicOnboarding.empty")}
              </p>
            )}

          {(form.readError || form.catalogBlocked) && (
            <Alert className="mx-auto my-6 max-w-lg">
              <AlertDescription>
                {form.catalogBlocked
                  ? t("musicOnboarding.errors.catalogRate", {
                      count: form.retrySeconds,
                    })
                  : t("musicOnboarding.errors.artists")}
              </AlertDescription>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={form.loading || form.saving || form.catalogBlocked}
                onClick={form.onRetry}
                className="mt-2"
              >
                {t("actions.retry")}
              </Button>
            </Alert>
          )}
        </div>

        <footer className="sticky bottom-3 z-30 mx-auto mt-8 flex w-full max-w-xl items-center justify-center gap-3 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg shadow-foreground/5 backdrop-blur-sm sm:mt-10">
          {canShowMore && (
            <LoadingButton
              type="button"
              variant="outline"
              loading={form.loading && !hasBufferedArtists}
              loadingLabel={t("musicOnboarding.loading")}
              disabled={
                form.saving || (!hasBufferedArtists && form.catalogBlocked)
              }
              onClick={showMore}
              className="min-h-10 flex-1"
            >
              <Plus aria-hidden="true" />
              {t("musicOnboarding.more")}
            </LoadingButton>
          )}

          <Button
            type="button"
            disabled={form.selected.length < 3 || form.saving}
            aria-describedby="musicOnboardingInstructions"
            onClick={continueToFavorites}
            className="min-h-10 flex-1"
          >
            {t("musicOnboarding.continue")}
            <ArrowRight aria-hidden="true" />
          </Button>
        </footer>
      </div>

      <OptionalMusicFavorites
        key={userId ?? "anonymous"}
        active={optionalVisible}
        saving={form.saving}
        canSubmit={form.canSubmit}
        catalogBlocked={form.catalogBlocked}
        retrySeconds={form.retrySeconds}
        onBack={() => {
          if (!form.saving) {
            setStep({ userId, optional: false });
          }
        }}
        onFinish={form.onSubmit}
        onCatalogError={form.onCatalogError}
      />

      {form.saveError && (
        <Alert
          variant="destructive"
          className="mx-auto mt-6 max-w-lg"
          role="alert"
        >
          <AlertDescription>
            {t(`musicOnboarding.errors.${form.saveError}`)}
          </AlertDescription>
        </Alert>
      )}

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {form.announcement
          ? t(`musicOnboarding.${form.announcement.kind}`, {
              name: form.announcement.name,
              count: form.selected.length,
            })
          : ""}
      </p>
    </section>
  );
}
