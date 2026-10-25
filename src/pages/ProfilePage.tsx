import { useTranslation } from "react-i18next";
import { ProfileForm } from "@/components/ProfileForm";
import { useProfileEditor } from "@/hooks/useProfileEditor";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const form = useProfileEditor("edit");

  return (
    <section className="mx-auto w-full max-w-2xl space-y-7">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-lg text-sm leading-6 text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <ProfileForm {...form} />
    </section>
  );
}
