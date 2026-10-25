import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  profileKey,
  profileWriteKey,
  useProfile,
} from "@/features/profile/hooks/useProfile";
import { profileSchema } from "@/features/profile/lib/profileValidation";
import {
  checkUsernameAvailability,
  saveProfile,
} from "@/features/profile/services/profileService";
import type {
  ProfileDraft,
  ProfileEditorMode,
  ProfileFieldErrors,
  ProfileFormProps,
  ProfileInput,
  ProfileTouchedFields,
} from "@/models/profile";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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

  const [settledUsername, setSettledUsername] = useState<{
    userId: string | null;
    username: string;
  } | null>(null);

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

  const username = values.username.trim().toLowerCase();
  const initialUsername = initial.username.trim().toLowerCase();

  const validUsername =
    profileSchema.shape.username.safeParse(username).success;

  const usernameChanged = username !== initialUsername;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettledUsername({ userId, username });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [userId, username]);

  const availabilityKey = ["usernameAvailability", userId, username] as const;

  const availability = useQuery({
    queryKey: availabilityKey,
    enabled:
      Boolean(userId && profile) &&
      validUsername &&
      usernameChanged &&
      settledUsername?.userId === userId &&
      settledUsername.username === username,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");

      return checkUsernameAvailability(userId, username, signal);
    },
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usernameTaken = usernameChanged && availability.data === false;

  const usernameChecked =
    !usernameChanged || (availability.data === true && !availability.isError);

  const checkingUsername =
    validUsername &&
    usernameChanged &&
    (availability.isFetching ||
      (!availability.isError && availability.data === undefined));

  const dirty =
    values.displayName.trim() !== initial.displayName.trim() ||
    username !== initialUsername ||
    values.bio.trim() !== initial.bio.trim();

  const disabled = writes > 0 || !userId || !profile;

  const canSubmit =
    !disabled &&
    parsed.success &&
    usernameChecked &&
    !availability.isFetching &&
    (mode === "onboarding" || dirty);

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

  if (validUsername && usernameTaken) {
    fieldErrors.username = t("feedback.usernameTaken");
  } else if (validUsername && usernameChanged && availability.isError) {
    fieldErrors.username = t("feedback.usernameCheckFailed");
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

    if (field === "username" && userId && validUsername && usernameChanged) {
      setSettledUsername({ userId, username });

      if (availability.isError) {
        void availability.refetch();
      }
    }
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
        queryClient.setQueryData(availabilityKey, false);
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
      usernameHint: checkingUsername
        ? t("feedback.usernameChecking")
        : usernameChanged && availability.data === true
          ? t("feedback.usernameAvailable")
          : t("fields.usernameHint"),
      bio: t("fields.bio"),
      submit: busy
        ? t("actions.saving")
        : t(mode === "onboarding" ? "actions.continue" : "actions.save"),
    },
  };
}
