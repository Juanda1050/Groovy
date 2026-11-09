import { ArrowRight, Check, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { ArtistBubble } from "@/features/preferences/components/ArtistBubble";
import { OptionalMusicFavorites } from "@/features/preferences/components/OptionalMusicFavorites";
import { SelectedArtists } from "@/features/preferences/components/SelectedArtists";
import { useArtistOnboarding } from "@/features/preferences/hooks/useArtistOnboarding";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export default function MusicOnboardingPage() {
  const { t } = useTranslation(["onboarding", "common"]);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const form = useArtistOnboarding();

  const [step, setStep] = useState<{
    userId: string | null;
    optional: boolean;
  }>({ userId, optional: false });

  const optionalVisible = step.userId === userId && step.optional;
  const previousStep = useRef(optionalVisible);

  useEffect(() => {
    if (previousStep.current === optionalVisible) return;

    previousStep.current = optionalVisible;

    const heading = document.getElementById(
      optionalVisible ? "optionalMusicTitle" : "musicOnboardingTitle",
    );

    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  }, [optionalVisible]);

  const viewKey = JSON.stringify([userId, form.search.trim()]);
  const [view, setView] = useState({ key: "", count: 15 });
  const visibleCount = view.key === viewKey ? view.count : 15;

  const selectedIds = new Set(form.selected.map((artist) => artist.id));
  const available = form.artists.filter(
    (artist) => !selectedIds.has(artist.id),
  );
  const visibleIds = new Set(
    available.slice(0, visibleCount).map((artist) => artist.id),
  );
  const displayedArtists = form.artists.filter(
    (artist) => selectedIds.has(artist.id) || visibleIds.has(artist.id),
  );

  const hasBufferedArtists = available.length > visibleCount;
  const canShowMore = hasBufferedArtists || form.hasMore;
  const initialLoading = form.loading && form.artists.length === 0;

  function showMore(): void {
    if (
      form.saving ||
      (!hasBufferedArtists && (form.catalogBlocked || form.loading))
    ) {
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
    <section className="min-w-0 pb-6">
      <ol
        aria-label={t("musicOnboarding.steps.label")}
        className="mb-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
      >
        <li
          aria-current={!optionalVisible ? "step" : undefined}
          className="inline-flex items-center gap-1.5 aria-[current=step]:font-semibold aria-[current=step]:text-primary"
        >
          {optionalVisible && (
            <Check aria-hidden="true" className="size-3.5 text-primary" />
          )}
          {t("musicOnboarding.steps.artists")}
        </li>
        <li aria-hidden="true">
          <ArrowRight className="size-3" />
        </li>
        <li
          aria-current={optionalVisible ? "step" : undefined}
          className="aria-[current=step]:font-semibold aria-[current=step]:text-primary"
        >
          {t("musicOnboarding.steps.favorites")}
        </li>
      </ol>

      <div hidden={optionalVisible}>
        <header>
          <h1
            id="musicOnboardingTitle"
            tabIndex={-1}
            className="scroll-mt-6 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
          >
            {t("musicOnboarding.title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("musicOnboarding.introduction")}
          </p>
          <p id="musicOnboardingInstructions" className="sr-only">
            {t("musicOnboarding.description")}
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
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
                className="h-11! min-h-11! rounded-lg py-2! pr-3! pl-9! text-base! sm:text-sm!"
              />
            </div>

            <Button
              type="button"
              disabled={form.selected.length < 3 || form.saving}
              aria-describedby="musicOnboardingInstructions"
              onClick={continueToFavorites}
              className="min-h-11! shrink-0 gap-2 rounded-lg sm:w-auto"
            >
              {t("musicOnboarding.continue")}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </header>

        {form.selected.length > 0 && (
          <div className="mt-5">
            <SelectedArtists
              artists={form.selected}
              disabled={form.saving}
              onRemove={form.onRemove}
            />
          </div>
        )}

        <div aria-busy={form.loading} className="mt-6">
          {initialLoading ? (
            <div role="status" aria-live="polite">
              <PageSkeleton variant="artists" />
              <span className="sr-only">{t("musicOnboarding.loading")}</span>
            </div>
          ) : (
            <div
              data-artist-grid
              aria-label={t("musicOnboarding.available")}
              className="grid grid-cols-2 items-start justify-items-center gap-x-6 gap-y-7 px-3 py-4 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-9 lg:grid-cols-4 xl:grid-cols-5"
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
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("musicOnboarding.empty")}
              </p>
            )}

          {canShowMore && !initialLoading && (
            <div className="flex justify-center pt-5">
              <LoadingButton
                type="button"
                variant="outline"
                loading={form.loading && !hasBufferedArtists}
                loadingLabel={t("musicOnboarding.more")}
                disabled={
                  form.saving || (!hasBufferedArtists && form.catalogBlocked)
                }
                onClick={showMore}
                className="min-h-11! max-w-full rounded-lg"
              >
                <Plus aria-hidden="true" />
                {t("musicOnboarding.more")}
              </LoadingButton>
            </div>
          )}

          {(form.readError || form.catalogBlocked) && (
            <Alert className="mt-5">
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
                {t("actions.retry", { ns: "common" })}
              </Button>
            </Alert>
          )}
        </div>

        {form.saveError && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>
              {t(`musicOnboarding.errors.${form.saveError}`)}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <OptionalMusicFavorites
        key={userId ?? "anonymous"}
        active={optionalVisible}
        artists={form.selected}
        saving={form.saving}
        canSubmit={form.canSubmit}
        saveError={form.saveError}
        catalogBlocked={form.catalogBlocked}
        retrySeconds={form.retrySeconds}
        onBack={() => {
          if (!form.saving) setStep({ userId, optional: false });
        }}
        onFinish={form.onSubmit}
        onCatalogError={form.onCatalogError}
      />

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
