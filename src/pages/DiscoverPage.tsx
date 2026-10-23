import { useTranslation } from "react-i18next";
import { PageIntro } from "@/components/PageIntro";

export default function DiscoverPage() {
  const { t } = useTranslation("discover");

  return (
    <PageIntro
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    />
  );
}
