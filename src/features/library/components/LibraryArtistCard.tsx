import { ExternalLink, Star, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { LibraryArtistCardProps } from "@/models/libraryView";

export function LibraryArtistCard({ artist }: LibraryArtistCardProps) {
  const { t } = useTranslation("library");
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const imageVisible =
    artist.imageUrl !== null && failedUrl !== artist.imageUrl;
  const name = artist.name ?? t("artists.unavailable");

  return (
    <a
      href={`https://open.spotify.com/artist/${artist.id}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("artists.open", { name })}
      className="group mx-auto flex w-full max-w-44 flex-col items-center gap-3 rounded-xl text-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <span className="relative block aspect-square w-full">
        {imageVisible && artist.imageUrl ? (
          <img
            src={artist.imageUrl}
            alt=""
            width={300}
            height={300}
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrl(artist.imageUrl)}
            className="size-full rounded-full object-cover ring-1 ring-border transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <span className="flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound aria-hidden="true" className="size-10" />
          </span>
        )}

        <span className="absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
          <Star aria-hidden="true" className="size-3.5 fill-current" />
        </span>
      </span>

      <span className="flex min-h-10 max-w-full items-start justify-center gap-1.5 px-1 text-sm font-medium leading-5">
        <span className="line-clamp-2">{name}</span>
        <ExternalLink
          aria-hidden="true"
          className="mt-1 size-3 shrink-0 text-muted-foreground"
        />
      </span>
    </a>
  );
}
