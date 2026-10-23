import { useTranslation } from "react-i18next";

export function usePageStatus() {
  const { t } = useTranslation("common");

  return {
    loadingLabel: t("status.loading"),
  };
}
