import { useTranslation } from "react-i18next";
import { PageIntro } from "@/components/PageIntro";

export default function ProfilePage() {
  const { t } = useTranslation("profile");

  return <PageIntro title={t("title")} description={t("description")} />;
}
