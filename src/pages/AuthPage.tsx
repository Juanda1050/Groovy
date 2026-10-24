import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthForm } from "@/components/AuthForm";
import { AuthArtwork } from "@/components/AuthArtwork";
import { AuthLoading } from "@/components/AuthLoading";
import { Card } from "@/components/ui/card";
import { useAuthForm } from "@/hooks/useAuthForm";
import { isLocalAuthBypassEnabled } from "@/lib/localDevelopment";
import { useAuthStore } from "@/stores/authStore";

export default function AuthPage() {
  const status = useAuthStore((state) => state.status);
  const { t } = useTranslation("auth");
  const form = useAuthForm();

  if (isLocalAuthBypassEnabled) {
    return <Navigate to="/library" replace />;
  }

  if (status === "loading") {
    return <AuthLoading label={t("loadingSession")} />;
  }

  if (status === "authenticated") {
    return <Navigate to="/library" replace />;
  }

  return (
    <section
      className="
        mx-auto grid w-full max-w-5xl items-center gap-9
        lg:grid-cols-[1fr_1fr] lg:gap-16
      "
    >
      <AuthArtwork
        eyebrow={t("artwork.eyebrow")}
        title={t("artwork.title")}
        description={t("artwork.description")}
      />

      <Card
        className="
          surfacePanel w-full gap-0 rounded-3xl
          py-7 sm:py-9
        "
      >
        <AuthForm {...form} />
      </Card>
    </section>
  );
}
