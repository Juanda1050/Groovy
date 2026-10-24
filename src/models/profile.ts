import type { Database } from "./database";

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
  busy: boolean;
  disabled: boolean;
  feedback: string | null;
  feedbackTone: "error" | "success" | null;
  onChange: (field: keyof ProfileInput, value: string) => void;
  onSubmit: () => Promise<void>;
}
