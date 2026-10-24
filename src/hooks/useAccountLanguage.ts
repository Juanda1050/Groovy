import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "./useUserSettings";

export function useAccountLanguage(): void {
  const { i18n } = useTranslation("common");
  const { data } = useUserSettings();
  const locale = data?.locale;

  useEffect(() => {
    if (!locale) return;

    const language = locale.split("-")[0] === "es" ? "es" : "en";

    if (i18n.resolvedLanguage !== language) {
      void i18n.changeLanguage(language).catch(() => {
        // Mantener el idioma actual si falla su carga.
      });
    }
  }, [locale, i18n]);
}
