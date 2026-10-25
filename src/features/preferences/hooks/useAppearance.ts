import { getAccentPalette,usePreferencesStore } from "@/features/preferences/stores/preferencesStore";
import { useEffect } from "react";

export function useAppearance() {
  const theme = usePreferencesStore((state) => state.theme);
  const accent = usePreferencesStore((state) => state.accent);

  useEffect(() => {
    const root = document.documentElement;
    const palette = getAccentPalette(accent);
    const dark = theme === "dark";

    root.classList.toggle("dark", dark);
    root.dataset.accent = accent;
    root.style.colorScheme = theme;

    root.style.setProperty("--palette-hue", String(palette.hue));
    root.style.setProperty("--palette-chroma", String(palette.chroma));

    root.style.setProperty("--primary", dark ? palette.dark : palette.light);

    root.style.setProperty(
      "--primary-hover",
      dark ? palette.darkHover : palette.lightHover,
    );

    root.style.removeProperty("--primary-foreground");
  }, [theme, accent]);
}
