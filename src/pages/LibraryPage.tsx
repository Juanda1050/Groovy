import { useTranslation } from "react-i18next";
import { PageIntro } from "@/components/PageIntro";

export default function LibraryPage() {
  const { t } = useTranslation("library");

  return <PageIntro title={t("title")} description={t("description")} />;
}
