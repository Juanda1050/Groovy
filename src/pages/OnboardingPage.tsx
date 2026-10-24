import { useTranslation } from "react-i18next";
import { PageIntro } from "@/components/PageIntro";
import { ProfileForm } from "@/components/ProfileForm";
import { useProfileEditor } from "@/hooks/useProfileEditor";

export default function OnboardingPage() {
  const { t } = useTranslation("profile");
  const form = useProfileEditor("onboarding");

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <PageIntro
        title={t("onboarding.title")}
        description={t("onboarding.description")}
      />

      <ProfileForm {...form} />
    </section>
  );
}
