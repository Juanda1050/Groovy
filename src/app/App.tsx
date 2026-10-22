import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { GlassPanel } from "@/components/GlassPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppearance } from "@/hooks/useAppearance";
import { useTheme } from "@/hooks/useTheme";

export default function App() {
  useAppearance();

  const { t } = useTranslation("discover");
  const { theme, label, toggleTheme } = useTheme();

  return (
    <AppShell
      actions={
        <ThemeToggle theme={theme} label={label} onToggle={toggleTheme} />
      }
    >
      <section className="max-w-3xl">
        <p className="mb-4 text-sm font-medium text-primary">{t("eyebrow")}</p>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          {t("title")}
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("description")}
        </p>
      </section>

      <GlassPanel className="mt-10 p-5 sm:p-8">
        <p className="text-muted-foreground">{t("searchPlaceholder")}</p>
      </GlassPanel>
    </AppShell>
  );
}
