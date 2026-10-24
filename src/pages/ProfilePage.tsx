import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { PageIntro } from "@/components/PageIntro";
import { SignOutButton } from "@/components/SignOutButton";
import { useSignOut } from "@/hooks/useSignOut";
import { PreferencesSection } from "./PreferencesSection";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const { error, ...signOutProps } = useSignOut();

  return (
    <div className="space-y-8">
      <PageIntro title={t("title")} description={t("description")} />
      <PreferencesSection />

      <SignOutButton {...signOutProps} />

      {error && (
        <Alert variant="destructive" className="max-w-lg rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
