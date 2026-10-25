import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { updateLanguage } from "@/services/profileService";
import { useAuthStore } from "@/stores/authStore";
import { useUserSettings, userSettingsKey } from "./useProfile";
import type { LanguageOption, LanguageSaveState } from "@/models/language";
import type { SupportedLanguage } from "@/models/preferences";
import type { UserSettings } from "@/models/profile";

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

  const [saveState, setSaveState] = useState<LanguageSaveState>("idle");

  const changing = useRef(false);

  const value = normalizeLanguage(i18n.resolvedLanguage ?? "en");

  const loading =
    status === "loading" || (userId !== null && settings.isPending);

  const saving = saveState === "saving";

  async function onChange(language: SupportedLanguage): Promise<void> {
    if (
      changing.current ||
      loading ||
      (userId !== null && !settings.isSuccess) ||
      language === normalizeLanguage(i18n.resolvedLanguage ?? "en")
    ) {
      return;
    }

    changing.current = true;
    setSaveState("saving");

    const requestedUserId = userId;

    try {
      if (requestedUserId) {
        await updateLanguage({
          userId: requestedUserId,
          locale: language,
        });
      }

      const currentUserId = useAuthStore.getState().user?.id ?? null;

      if (currentUserId !== requestedUserId) {
        setSaveState("idle");
        return;
      }

      if (requestedUserId) {
        queryClient.setQueryData<UserSettings>(
          userSettingsKey(requestedUserId),
          {
            user_id: requestedUserId,
            locale: language,
          },
        );
      }

      await i18n.changeLanguage(language);

      if ((useAuthStore.getState().user?.id ?? null) === requestedUserId) {
        setSaveState(requestedUserId ? "savedAccount" : "savedDevice");
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("error");
    } finally {
      changing.current = false;
    }
  }

  const error =
    settings.isError || saveState === "error" ? t("language.error") : null;

  const message = loading
    ? t("language.loading")
    : saving
      ? t("language.saving")
      : saveState === "savedAccount"
        ? t("language.savedAccount")
        : saveState === "savedDevice"
          ? t("language.savedDevice")
          : t(userId ? "language.accountHint" : "language.deviceHint");

  return {
    options,
    value,
    onChange,
    label: t("language.label"),
    disabled: loading || saving || (userId !== null && !settings.isSuccess),
    busy: loading || saving,
    saved: saveState === "savedAccount" || saveState === "savedDevice",
    message,
    error,
    canRetry: settings.isError,
    retrying: settings.isFetching,
    retryLabel: t("actions.retry"),
    onRetry: () => {
      void settings.refetch();
    },
  };
}
