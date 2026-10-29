import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { SelectedArtistsProps } from "@/models/musicOnboarding";
import { Button } from "@/shared/components/ui/button";

export function SelectedArtists({
  artists,
  disabled,
  onRemove,
}: SelectedArtistsProps) {
  const { t } = useTranslation("common");

  if (artists.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="selectedArtistsTitle"
      className="mx-auto max-w-3xl"
    >
      <h2
        id="selectedArtistsTitle"
        className="mb-4 text-center text-sm font-medium text-foreground"
      >
        {t("musicOnboarding.selectedLabel")}
      </h2>

      <ul className="flex max-h-44 flex-wrap justify-center gap-x-4 gap-y-3 overflow-y-auto px-2 py-2 sm:gap-x-5">
        {artists.map((artist) => (
          <li key={artist.id} className="w-20">
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              aria-label={t("musicOnboarding.remove", { name: artist.name })}
              className="group h-auto! min-h-0! w-full flex-col gap-2 border-0! p-0! text-foreground outline-none hover:bg-transparent! focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={(event) => {
                const button = event.currentTarget;

                const buttons = Array.from(
                  button
                    .closest("ul")
                    ?.querySelectorAll<HTMLButtonElement>(
                      "button:not(:disabled)",
                    ) ?? [],
                );

                const index = buttons.indexOf(button);

                const next = buttons[index + 1] ?? buttons[index - 1];

                onRemove(artist.id);

                if (event.detail === 0) {
                  if (next) {
                    next.focus();
                  } else {
                    document.getElementById("musicArtistSearch")?.focus();
                  }
                }
              }}
            >
              <span className="relative block size-14 sm:size-16">
                <img
                  src={artist.imageUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="size-full rounded-full object-cover ring-2 ring-primary/40 ring-offset-2 ring-offset-background group-hover:ring-primary"
                />

                <span className="absolute -right-1 top-0 grid size-5 place-items-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-border">
                  <X aria-hidden="true" />
                </span>
              </span>

              <span className="line-clamp-2 min-h-8 w-full whitespace-normal text-center text-xs font-medium leading-4 text-foreground">
                {artist.name}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
