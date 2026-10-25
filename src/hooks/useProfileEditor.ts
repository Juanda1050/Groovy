import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { profileSchema } from "@/lib/profileValidation";
import { saveProfile } from "@/services/profileService";
import { useAuthStore } from "@/stores/authStore";
import { profileKey, profileWriteKey, useProfile } from "./useProfile";
import type {
  ProfileDraft,
  ProfileEditorMode,
  ProfileFieldErrors,
  ProfileFormProps,
  ProfileInput,
  ProfileTouchedFields,
} from "@/models/profile";

export function useProfileEditor(mode: ProfileEditorMode): ProfileFormProps {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const { data: profile } = useProfile();

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [touched, setTouched] = useState<ProfileTouchedFields>({});
  const [feedbackKey, setFeedbackKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);

  const writes = useIsMutating({
    mutationKey: profileWriteKey(userId),
  });

  const mutation = useMutation({
    mutationKey: profileWriteKey(userId),
    mutationFn: saveProfile,
    retry: false,
  });

  const busy = mutation.isPending;

  const initial: ProfileInput = {
    displayName: profile?.display_name ?? "",
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
  };

  const values = draft?.userId === userId ? draft.values : initial;

  const parsed = profileSchema.safeParse(values);

  const dirty =
    values.displayName.trim() !== initial.displayName.trim() ||
    values.username.trim().toLowerCase() !==
      initial.username.trim().toLowerCase() ||
    values.bio.trim() !== initial.bio.trim();

  const disabled = writes > 0 || !userId || !profile;

  const canSubmit =
    !disabled && parsed.success && (mode === "onboarding" || dirty);

  const fieldErrors: ProfileFieldErrors = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];

      if (
        (field === "displayName" || field === "username" || field === "bio") &&
        touched[field] &&
        !fieldErrors[field]
      ) {
        fieldErrors[field] = t(`validation.${issue.message}`);
      }
    }
  }

  function onChange(field: keyof ProfileInput, value: string): void {
    if (!userId || submitting.current || disabled) return;

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

  function onBlur(field: keyof ProfileInput): void {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function onSubmit(): Promise<void> {
    if (
      !userId ||
      submitting.current ||
      !canSubmit ||
      queryClient.isMutating({
        mutationKey: profileWriteKey(userId),
      }) > 0
    ) {
      return;
    }

    const result = profileSchema.safeParse(values);

    if (!result.success) return;

    const requestedUserId = userId;
    submitting.current = true;
    setFeedbackKey(null);
    setSaved(false);

    try {
      const updated = await mutation.mutateAsync(result.data);

      if (useAuthStore.getState().user?.id !== requestedUserId) return;

      queryClient.setQueryData(profileKey(requestedUserId), updated);

      setDraft(null);
      setTouched({});
      setSaved(true);
      setFeedbackKey("feedback.saved");

      if (mode === "onboarding") {
        navigate("/profile", { replace: true });
      }
    } catch (error: unknown) {
      if (useAuthStore.getState().user?.id !== requestedUserId) return;

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
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        (error.message === "SESSION_EXPIRED" ||
          error.message === "AUTH_REQUIRED")
      ) {
        setFeedbackKey("feedback.signInRequired");
      } else {
        setFeedbackKey("feedback.failed");
      }
    } finally {
      submitting.current = false;
    }
  }

  const feedback = !userId
    ? t("feedback.signInRequired")
    : feedbackKey
      ? t(feedbackKey)
      : null;

  return {
    values,
    avatarUrl: profile?.avatar_url ?? null,
    fieldErrors,
    busy,
    disabled,
    canSubmit,
    dirty,
    onChange,
    onBlur,
    onSubmit,
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
