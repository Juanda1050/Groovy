import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageIntro } from "@/components/PageIntro";
import { ProfileForm } from "@/components/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { useSignOut } from "@/hooks/useSignOut";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const form = useProfileEditor("edit");
  const { error, ...signOutProps } = useSignOut();

  return (
    <div className="space-y-8">
      <PageIntro title={t("title")} description={t("description")} />

      <ProfileForm {...form} />

      <div className="max-w-lg border-t border-border/40 pt-6">
        <SignOutButton {...signOutProps} />
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-lg">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
