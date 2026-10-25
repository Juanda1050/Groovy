import type { Database } from "./database";
import type { FeedProfile } from "./library";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

export type ProfileEditorMode = "onboarding" | "edit";

export interface ProfileInput {
  displayName: string;
  username: string;
  bio: string;
}

export interface ProfileDraft {
  userId: string;
  values: ProfileInput;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string>>;

export type ProfileTouchedFields = Partial<Record<keyof ProfileInput, boolean>>;

export interface ProfileFormLabels {
  displayName: string;
  username: string;
  usernameHint: string;
  bio: string;
  submit: string;
}

export interface ProfileFormProps {
  values: ProfileInput;
  labels: ProfileFormLabels;
  avatarUrl: string | null;
  fieldErrors: ProfileFieldErrors;
  busy: boolean;
  disabled: boolean;
  canSubmit: boolean;
  dirty: boolean;
  feedback: string | null;
  feedbackTone: "error" | "success" | null;
  onChange: (field: keyof ProfileInput, value: string) => void;
  onBlur: (field: keyof ProfileInput) => void;
  onSubmit: () => Promise<void>;
}

export interface UserAvatarProps {
  name: string;
  src?: string | null | undefined;
  size?: "sm" | "lg";
}

export interface AvatarEditorProps {
  name: string;
  username: string;
  avatarPath: string | null;
  disabled: boolean;
}

export interface AvatarDraft {
  userId: string;
  path: string;
  blob: Blob;
  previewUrl: string;
}

export interface AvatarUploadInput {
  userId: string;
  path: string;
  file: Blob;
}

export interface ProfileSearchResult extends FeedProfile {
  following: boolean;
}

export interface ProfileSearchPage {
  items: ProfileSearchResult[];
  hasMore: boolean;
}
