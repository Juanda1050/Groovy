import { useEffect, useRef, useState } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { prepareAvatar } from "@/lib/avatarImage";
import {
  discardProfileAvatar,
  getAvatarUrl,
  getProfile,
  getUserSettings,
  saveProfileAvatar,
} from "@/services/profileService";
import { useAuthStore } from "@/stores/authStore";
import type { AvatarDraft, Profile } from "@/models/profile";

const accountStaleTime = 5 * 60_000;

export function profileKey(userId: string | null) {
  return ["profile", userId] as const;
}

export function userSettingsKey(userId: string | null) {
  return ["userSettings", userId] as const;
}

export function profileWriteKey(userId: string | null) {
  return ["profileWrite", userId] as const;
}

function getAvatarErrorKey(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  switch (code) {
    case "AVATAR_INVALID_TYPE":
      return "avatar.errors.type";
    case "AVATAR_SOURCE_TOO_LARGE":
      return "avatar.errors.sourceSize";
    case "AVATAR_INVALID_RESOLUTION":
      return "avatar.errors.resolution";
    case "AVATAR_INVALID_IMAGE":
      return "avatar.errors.invalidImage";
    case "AVATAR_ENCODING_FAILED":
    case "AVATAR_OUTPUT_TOO_LARGE":
    case "AVATAR_INVALID_UPLOAD":
      return "avatar.errors.processing";
    case "AUTH_REQUIRED":
    case "SESSION_EXPIRED":
      return "avatar.errors.session";
    case "RATE_LIMITED":
      return "avatar.errors.rate";
    default:
      return "avatar.errors.save";
  }
}

export function useProfile() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: profileKey(userId),
    enabled: userId !== null,
    staleTime: accountStaleTime,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Authentication required.");

      return getProfile(userId, signal);
    },
  });
}

export function useUserSettings() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: userSettingsKey(userId),
    enabled: userId !== null,
    staleTime: accountStaleTime,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Authentication required.");

      return getUserSettings(userId, signal);
    },
  });
}

export function useAvatarUrl(source: string | null | undefined) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const direct = Boolean(
    source?.startsWith("blob:") || source?.startsWith("https://"),
  );

  const query = useQuery({
    queryKey: ["avatar", userId, source ?? null],
    enabled: userId !== null && Boolean(source) && !direct,
    queryFn: () => {
      if (!source) throw new Error("AVATAR_NOT_FOUND");

      return getAvatarUrl(source);
    },
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchInterval: 50 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  return {
    src: direct ? (source ?? null) : (query.data ?? null),
    direct,
    refresh: query.refetch,
  };
}

export function useProfileAvatar() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const writes = useIsMutating({
    mutationKey: profileWriteKey(userId),
  });

  const [draft, setDraft] = useState<AvatarDraft | null>(null);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const mounted = useRef(false);
  const revision = useRef(0);

  const currentDraft = draft?.userId === userId ? draft : null;
  const previewUrl = currentDraft?.previewUrl;

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      revision.current += 1;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const mutation = useMutation({
    mutationKey: profileWriteKey(userId),
    mutationFn: saveProfileAvatar,
    retry: false,
    onSuccess: (saved, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) return;

      queryClient.setQueryData<Profile>(profileKey(request.userId), saved);

      setDraft(null);
      setLocalError(null);
    },
  });

  async function cleanupDraft(pending: AvatarDraft): Promise<void> {
    const current = await discardProfileAvatar(
      pending.userId,
      pending.path,
    ).catch(() => null);

    if (current && useAuthStore.getState().user?.id === pending.userId) {
      queryClient.setQueryData(profileKey(pending.userId), current);
    }
  }

  async function onChoose(file: File): Promise<void> {
    if (!userId || processing || writes > 0) return;

    const requestedUserId = userId;
    const currentRevision = ++revision.current;
    const previous = currentDraft;
    const previousAttempted =
      previous !== null && mutation.variables?.path === previous.path;

    setProcessing(true);
    setLocalError(null);
    mutation.reset();

    try {
      const blob = await prepareAvatar(file);

      if (
        !mounted.current ||
        revision.current !== currentRevision ||
        useAuthStore.getState().user?.id !== requestedUserId
      ) {
        return;
      }

      setDraft({
        userId: requestedUserId,
        path: `${requestedUserId}/${crypto.randomUUID()}.webp`,
        blob,
        previewUrl: URL.createObjectURL(blob),
      });

      if (previous && previousAttempted) {
        void cleanupDraft(previous);
      }
    } catch (error: unknown) {
      if (mounted.current && revision.current === currentRevision) {
        setLocalError(getAvatarErrorKey(error));
      }
    } finally {
      if (mounted.current && revision.current === currentRevision) {
        setProcessing(false);
      }
    }
  }

  function onSave(): void {
    if (
      !userId ||
      !currentDraft ||
      processing ||
      queryClient.isMutating({
        mutationKey: profileWriteKey(userId),
      }) > 0
    ) {
      return;
    }

    mutation.mutate({
      userId,
      path: currentDraft.path,
      file: currentDraft.blob,
    });
  }

  function onCancel(): void {
    if (processing || writes > 0) return;

    const previous = currentDraft;
    const attempted =
      previous !== null && mutation.variables?.path === previous.path;

    setDraft(null);
    setLocalError(null);
    mutation.reset();

    if (previous && attempted) {
      void cleanupDraft(previous);
    }
  }

  return {
    previewUrl,
    hasDraft: currentDraft !== null,
    busy: processing || writes > 0,
    processing,
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    errorKey:
      localError ??
      (mutation.isError ? getAvatarErrorKey(mutation.error) : null),
    onChoose,
    onSave,
    onCancel,
  };
}
