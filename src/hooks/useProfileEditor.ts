import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { profileSchema } from "@/lib/profileValidation";
import { saveProfile } from "@/services/profileService";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "./useProfile";
import type {
  ProfileDraft,
  ProfileEditorMode,
  ProfileFormProps,
  ProfileInput,
} from "@/models/profile";

export function useProfileEditor(mode: ProfileEditorMode): ProfileFormProps {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const { data: profile } = useProfile();

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedbackKey, setFeedbackKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);

  const values: ProfileInput =
    draft && draft.userId === userId
      ? draft.values
      : {
          displayName: profile?.display_name ?? "",
          username: profile?.username ?? "",
          bio: profile?.bio ?? "",
        };

  function onChange(field: keyof ProfileInput, value: string): void {
    if (!userId || submitting.current) return;

    setDraft({
      userId,
      values: {
        ...values,
        [field]: field === "username" ? value.toLowerCase() : value,
      },
    });

    setFeedbackKey(null);
    setSaved(false);
  }

  async function onSubmit(): Promise<void> {
    if (!userId || submitting.current) return;

    const parsed = profileSchema.safeParse(values);

    if (!parsed.success) {
      setSaved(false);
      setFeedbackKey("feedback.invalidInput");
      return;
    }

    const requestedUserId = userId;
    submitting.current = true;
    setBusy(true);
    setFeedbackKey(null);
    setSaved(false);

    try {
      const updated = await saveProfile(parsed.data);

      if (useAuthStore.getState().user?.id !== requestedUserId) {
        return;
      }

      queryClient.setQueryData(["profile", requestedUserId], updated);

      setDraft(null);
      setSaved(true);
      setFeedbackKey("feedback.saved");

      if (mode === "onboarding") {
        navigate("/profile", { replace: true });
      }
    } catch (error: unknown) {
      if (useAuthStore.getState().user?.id !== requestedUserId) {
        return;
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        setFeedbackKey("feedback.usernameTaken");
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        error.message === "RATE_LIMITED"
      ) {
        setFeedbackKey("feedback.rateLimited");
      } else {
        setFeedbackKey("feedback.failed");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const feedback = !userId
    ? t("feedback.signInRequired")
    : feedbackKey
      ? t(feedbackKey)
      : null;

  return {
    values,
    busy,
    onChange,
    onSubmit,
    disabled: busy || !userId || !profile,
    feedback,
    feedbackTone: feedback ? (saved ? "success" : "error") : null,
    labels: {
      displayName: t("fields.displayName"),
      username: t("fields.username"),
      usernameHint: t("fields.usernameHint"),
      bio: t("fields.bio"),
      submit: busy
        ? t("actions.saving")
        : t(mode === "onboarding" ? "actions.continue" : "actions.save"),
    },
  };
}
