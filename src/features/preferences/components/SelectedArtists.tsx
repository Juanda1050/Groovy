import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { SelectedArtistsProps } from "@/models/musicOnboarding";
import { Button } from "@/shared/components/ui/button";

export function SelectedArtists({
  artists,
  disabled,
  onRemove,
}: SelectedArtistsProps) {
  const { t } = useTranslation("onboarding");

  if (artists.length === 0) return null;

  return (
    <section
      aria-label={t("musicOnboarding.selectedLabel")}
      className="mx-auto max-w-3xl"
    >
      <ul className="flex max-h-32 flex-wrap justify-center gap-2 overflow-y-auto p-1">
        {artists.map((artist) => (
          <li key={artist.id} className="min-w-0 max-w-full">
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              aria-label={t("musicOnboarding.remove", {
                name: artist.name,
              })}
              title={artist.name}
              className="h-10! min-h-10! max-w-48 gap-2 rounded-full bg-muted/60 py-1! pr-3! pl-1! text-foreground hover:bg-accent"
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
              <img
                src={artist.imageUrl}
                alt=""
                width={32}
                height={32}
                decoding="async"
                className="size-8 shrink-0 rounded-full object-cover"
              />
              <span className="truncate text-xs font-medium">
                {artist.name}
              </span>
              <X
                aria-hidden="true"
                className="size-3.5! shrink-0 text-muted-foreground"
              />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
