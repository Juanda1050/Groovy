import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { signOut } from "@/services/authService";

export function useSignOut() {
  const { t } = useTranslation("auth");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  async function onSignOut(): Promise<void> {
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError(null);

    try {
      await signOut();
    } catch {
      setError(t("feedback.requestFailed"));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return {
    busy,
    error,
    onSignOut,
    label: t("signOut"),
  };
}
