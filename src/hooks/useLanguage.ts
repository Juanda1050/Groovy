import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { updateLanguage } from "@/services/settingsService";
import { useAuthStore } from "@/stores/authStore";
import { useUserSettings } from "./useUserSettings";
import type { LanguageOption } from "@/models/language";
import type { SupportedLanguage } from "@/models/preferences";

const options: readonly LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

function normalizeLanguage(value: string): SupportedLanguage {
  return value.split("-")[0] === "es" ? "es" : "en";
}

export function useLanguage() {
  const { t, i18n } = useTranslation("common");
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const settings = useUserSettings();
  const [saving, setSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const changing = useRef(false);

  const savedLocale = settings.data?.locale;

  useEffect(() => {
    if (!savedLocale) return;

    const language = normalizeLanguage(savedLocale);

    if (normalizeLanguage(i18n.resolvedLanguage ?? "en") !== language) {
      void i18n.changeLanguage(language).catch(() => {
        setHasError(true);
      });
    }
  }, [savedLocale, i18n]);

  async function onChange(language: SupportedLanguage): Promise<void> {
    if (changing.current) return;

    changing.current = true;
    setSaving(true);
    setHasError(false);

    const requestedUserId = userId;

    try {
      if (requestedUserId) {
        await updateLanguage({
          userId: requestedUserId,
          locale: language,
        });
      }

      const currentUserId = useAuthStore.getState().user?.id ?? null;

      // No aplicar una respuesta de una cuenta anterior.
      if (currentUserId !== requestedUserId) return;

      if (requestedUserId) {
        queryClient.setQueryData(["userSettings", requestedUserId], {
          user_id: requestedUserId,
          locale: language,
        });
      }

      await i18n.changeLanguage(language);
    } catch {
      setHasError(true);
    } finally {
      changing.current = false;
      setSaving(false);
    }
  }

  return {
    options,
    onChange,
    value: normalizeLanguage(i18n.resolvedLanguage ?? "en"),
    label: t("language.label"),
    disabled:
      saving ||
      status === "loading" ||
      (userId !== null && !settings.isSuccess),
    error: hasError || settings.isError ? t("language.error") : null,
    canRetry: settings.isError,
    retryLabel: t("actions.retry"),
    onRetry: () => {
      void settings.refetch();
    },
  };
}
