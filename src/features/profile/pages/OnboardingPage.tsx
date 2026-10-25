import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { useProfileEditor } from "@/features/profile/hooks/useProfileEditor";
import { useTranslation } from "react-i18next";

export default function OnboardingPage() {
  const { t } = useTranslation("profile");
  const form = useProfileEditor("onboarding");

  return (
    <section className="mx-auto w-full max-w-2xl space-y-7">
      <header className="max-w-lg space-y-3">
        <p className="text-xs font-medium text-primary">
          {t("onboarding.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("onboarding.title")}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {t("onboarding.description")}
        </p>
      </header>

      <ProfileForm {...form} />
    </section>
  );
}
