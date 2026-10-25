export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthMode = "signIn" | "signUp";

export type AuthFieldName = "email" | "password" | "confirmPassword";

export type AuthFeedback =
  | "invalidInput"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "weakPassword"
  | "rateLimited"
  | "network"
  | "requestFailed"
  | "registrationUnavailable";

export type AuthFieldErrors = Partial<Record<AuthFieldName, string>>;

export type PasswordStatus = "empty" | "invalid" | "partial" | "valid";

export type PasswordRuleId =
  | "length"
  | "lowercase"
  | "uppercase"
  | "number"
  | "special";

export interface PasswordCheck {
  id: PasswordRuleId;
  passed: boolean;
}

export interface PasswordRuleView extends PasswordCheck {
  label: string;
}

export interface PasswordRulesProps {
  checks: readonly PasswordRuleView[];
  status: PasswordStatus;
  label: string;
  heading: string;
}

export interface RecordLoaderProps {
  size?: "sm" | "lg";
}

export interface AuthLoadingProps {
  label: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthField {
  name: AuthFieldName;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  minLength?: number;
  maxLength: number;
  inputMode?: "email" | "numeric" | "text";
  visibilityLabel?: string;
  onToggleVisibility?: () => void;
}

export interface AuthFormProps {
  title: string;
  description: string;
  fields: readonly AuthField[];
  values: AuthValues;
  fieldErrors: AuthFieldErrors;
  passwordRules: PasswordRulesProps | null;
  feedback: string | null;
  feedbackTone: "error" | "info";
  busy: boolean;
  canSubmit: boolean;
  submitLabel: string;
  switchLabel: string;
  onChange: (name: AuthFieldName, value: string) => void;
  onSubmit: () => Promise<void>;
  onSwitch: () => void;
}

export interface SignOutButtonProps {
  label: string;
  busy: boolean;
  onSignOut: () => Promise<void>;
}

export interface ProtectedRouteProps {
  status: AuthStatus;
}

export interface AuthArtworkProps {
  eyebrow: string;
  title: string;
  description: string;
}

export type AuthObserver = (user: AuthUser | null) => void;
