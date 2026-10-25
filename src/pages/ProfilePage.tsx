import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileForm } from "@/components/ProfileForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { useTheme } from "@/hooks/useTheme";
import { accentOptions, usePreferencesStore } from "@/stores/preferencesStore";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const form = useProfileEditor("edit");
  const { theme, label, toggleTheme } = useTheme();
  const accent = usePreferencesStore((state) => state.accent);
  const setAccent = usePreferencesStore((state) => state.setAccent);

  return (
    <section className="mx-auto w-full max-w-2xl space-y-7">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </header>

      <ProfileForm {...form} />

      <section
        aria-labelledby="profileAppearanceTitle"
        className="space-y-4 border-t border-border/40 pt-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="profileAppearanceTitle" className="text-sm font-semibold">
            {t("colors.title")}
          </h2>
          <ThemeToggle theme={theme} label={label} onToggle={toggleTheme} />
        </div>

        <div
          role="group"
          aria-label={t("colors.title")}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {accentOptions.map((option) => {
            const selected = accent === option.value;

            return (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                aria-pressed={selected}
                className={`relative min-h-24 min-w-0 flex-col gap-3 whitespace-normal rounded-xl px-2 py-4 text-center text-xs ${
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAccent(option.value)}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex items-center -space-x-1"
                >
                  {option.swatches.map((color) => (
                    <span
                      key={color}
                      className="size-5 rounded-full ring-2 ring-card"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>

                <span>{t(`colors.${option.value}`)}</span>

                {selected && (
                  <Check
                    aria-hidden="true"
                    className="absolute right-2 top-2 size-3 text-primary"
                  />
                )}
              </Button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">{t("colors.hint")}</p>
      </section>
    </section>
  );
}
