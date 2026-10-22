import { useEffect } from "react";
import { usePreferencesStore } from "@/stores/preferencesStore";

export function useAppearance() {
  const theme = usePreferencesStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);
}
