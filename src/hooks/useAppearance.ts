import { useEffect } from "react";
import {
  getAccentPalette,
  usePreferencesStore,
} from "@/stores/preferencesStore";

export function useAppearance() {
  const theme = usePreferencesStore((state) => state.theme);
  const accent = usePreferencesStore((state) => state.accent);

  useEffect(() => {
    const root = document.documentElement;
    const palette = getAccentPalette(accent);
    const dark = theme === "dark";

    root.classList.toggle("dark", dark);
    root.style.colorScheme = theme;

    root.style.setProperty("--primary", dark ? palette.dark : palette.light);
    root.style.setProperty(
      "--primary-hover",
      dark ? palette.darkHover : palette.lightHover,
    );
    root.style.setProperty(
      "--primary-foreground",
      dark ? "#06182b" : "#ffffff",
    );
  }, [theme, accent]);
}
