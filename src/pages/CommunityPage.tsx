import { useTranslation } from "react-i18next";
import { PageIntro } from "@/components/PageIntro";

export default function CommunityPage() {
  const { t } = useTranslation("community");

  return <PageIntro title={t("title")} description={t("description")} />;
}
