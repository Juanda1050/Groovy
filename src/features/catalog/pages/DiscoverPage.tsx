import { Disc3, Mic2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AlbumDiscovery } from "@/features/catalog/components/AlbumDiscovery";
import { ArtistDiscovery } from "@/features/catalog/components/ArtistDiscovery";
import { Button } from "@/shared/components/ui/button";

export default function DiscoverPage() {
  const { t } = useTranslation("discover");
  const [params, setParams] = useSearchParams();
  const section = params.get("catalog") === "artists" ? "artists" : "albums";

  return (
    <section className="min-w-0 space-y-6 pb-6">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <div
        role="group"
        aria-label={t("sections.label")}
        className="flex w-fit gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
      >
        {(["albums", "artists"] as const).map((value) => {
          const Icon = value === "albums" ? Disc3 : Mic2;

          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              aria-pressed={section === value}
              onClick={() => {
                if (section === value) return;

                setParams((current) => {
                  const next = new URLSearchParams(current);
                  next.set("catalog", value);
                  return next;
                });
              }}
              className="min-h-11 min-w-28 rounded-lg aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-sm"
            >
              <Icon aria-hidden="true" />
              {t(`sections.${value}`)}
            </Button>
          );
        })}
      </div>

      {section === "artists" ? <ArtistDiscovery /> : <AlbumDiscovery />}
    </section>
  );
}
