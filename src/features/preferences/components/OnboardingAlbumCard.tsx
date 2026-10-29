import { useQueryClient } from "@tanstack/react-query";
import { Music2, Star } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { albumDetailOptions } from "@/features/catalog/lib/albumQueries";
import type { AlbumDetail } from "@/models/albumDetail";
import type { CatalogAlbum } from "@/models/catalog";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";

interface OnboardingAlbumCardProps {
  album: CatalogAlbum;
  selectedAlbum: AlbumDetail["album"] | null;
  disabled: boolean;
  atLimit: boolean;
  catalogBlocked: boolean;
  onOpen: (id: string) => void;
  onToggle: (album: AlbumDetail["album"]) => void;
  onCatalogError: (error: unknown) => void;
}

export function OnboardingAlbumCard({
  album,
  selectedAlbum,
  disabled,
  atLimit,
  catalogBlocked,
  onOpen,
  onToggle,
  onCatalogError,
}: OnboardingAlbumCardProps) {
  const { t } = useTranslation("onboarding");
  const client = useQueryClient();
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const selected = selectedAlbum !== null;
  const artistNames = album.artists.map((artist) => artist.name).join(", ");

  async function toggleFavorite(): Promise<void> {
    if (
      disabled ||
      lock.current ||
      (!selected && (atLimit || catalogBlocked))
    ) {
      return;
    }

    if (selectedAlbum) {
      setFailed(false);
      onToggle(selectedAlbum);
      return;
    }

    const userId = useAuthStore.getState().user?.id;

    if (!userId) return;

    lock.current = true;
    setLoading(true);
    setFailed(false);

    try {
      const detail = await client.fetchQuery({
        ...albumDetailOptions(userId, album.id),
        retry: false,
      });

      if (useAuthStore.getState().user?.id === userId) {
        onToggle(detail.album);
      }
    } catch (error: unknown) {
      if (useAuthStore.getState().user?.id === userId) {
        setFailed(true);
        onCatalogError(error);
      }
    } finally {
      lock.current = false;

      if (useAuthStore.getState().user?.id === userId) {
        setLoading(false);
      }
    }
  }

  return (
    <article className="min-w-0">
      <div className="relative">
        <Button
          id={`onboardingAlbum${album.id}`}
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => onOpen(album.id)}
          aria-label={t("musicOnboarding.optional.chooseFromAlbum", {
            name: album.name,
          })}
          className={[
            "block! h-auto! min-h-0! w-full overflow-hidden rounded-xl border-0! p-0!",
            "bg-muted shadow-sm hover:bg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            selected ? "ring-2 ring-primary" : "ring-1 ring-border/50",
          ].join(" ")}
        >
          <span className="block aspect-square">
            {album.coverUrl ? (
              <img
                src={album.coverUrl}
                alt=""
                width={300}
                height={300}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Music2
                  aria-hidden="true"
                  className="size-10! text-muted-foreground"
                />
              </span>
            )}
          </span>
        </Button>

        <Button
          type="button"
          variant={selected ? "default" : "outline"}
          size="icon"
          aria-pressed={selected}
          aria-busy={loading}
          aria-label={
            selected
              ? t("musicOnboarding.optional.remove", { name: album.name })
              : `${t("musicOnboarding.optional.favoriteAlbum")}: ${album.name}`
          }
          disabled={
            disabled || loading || (!selected && (atLimit || catalogBlocked))
          }
          onClick={() => void toggleFavorite()}
          className={[
            "absolute right-2 bottom-2 size-11! min-h-11! rounded-lg p-0! shadow-sm",
            selected ? "" : "bg-background/95",
          ].join(" ")}
        >
          {loading ? (
            <RecordLoader size="sm" />
          ) : (
            <Star
              aria-hidden="true"
              className={selected ? "size-5! fill-current" : "size-5!"}
            />
          )}
        </Button>
      </div>

      <div className="pt-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
          <Button
            type="button"
            variant="link"
            disabled={disabled}
            onClick={() => onOpen(album.id)}
            className="inline! h-auto! min-h-0! border-0! p-0! text-left text-foreground whitespace-normal"
          >
            {album.name}
          </Button>
        </h3>

        <p
          title={artistNames}
          className="mt-1 truncate text-xs leading-5 text-muted-foreground"
        >
          {artistNames}
        </p>
      </div>

      {failed && (
        <p role="alert" className="mt-2 text-xs leading-5 text-destructive">
          {t("musicOnboarding.optional.loadError")}
        </p>
      )}
    </article>
  );
}
