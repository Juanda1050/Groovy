import { usePreferencesStore } from "@/features/preferences/stores/preferencesStore";
import { useTranslation } from "react-i18next";

export function useTheme() {
  const { t } = useTranslation("common");
  const theme = usePreferencesStore((state) => state.theme);
  const toggleTheme = usePreferencesStore((state) => state.toggleTheme);

  return {
    theme,
    toggleTheme,
    label: t(
      theme === "dark" ? "appearance.switchToLight" : "appearance.switchToDark",
    ),
  };
}
