import { Disc3, Mic2, Shuffle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { AlbumDiscovery } from "@/features/catalog/components/AlbumDiscovery";
import { ArtistDiscovery } from "@/features/catalog/components/ArtistDiscovery";
import { AlbumRecommendation } from "@/features/catalog/components/AlbumRecommendation";
import { Button } from "@/shared/components/ui/button";

const sections = [
  { value: "albums", Icon: Disc3 },
  { value: "artists", Icon: Mic2 },
  { value: "forYou", Icon: Shuffle },
] as const;

export default function DiscoverPage() {
  const { t } = useTranslation("discover");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [params, setParams] = useSearchParams();
  const requested = params.get("catalog");

  const section =
    requested === "artists" || requested === "forYou" ? requested : "albums";

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
        className="inline-flex max-w-full gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
      >
        {sections.map(({ value, Icon }) => (
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
            className="min-h-11 min-w-0 rounded-lg px-2.5 text-xs aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-sm sm:min-w-28 sm:px-3 sm:text-sm"
          >
            <Icon aria-hidden="true" />
            {t(`sections.${value}`)}
          </Button>
        ))}
      </div>

      {section === "artists" ? (
        <ArtistDiscovery />
      ) : section === "forYou" ? (
        <AlbumRecommendation key={userId ?? "anonymous"} />
      ) : (
        <AlbumDiscovery />
      )}
    </section>
  );
}
