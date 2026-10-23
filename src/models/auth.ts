export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthMode = "signIn" | "signUp" | "verify";

export type AuthFieldName = "email" | "password" | "code";

export type AuthFeedback =
  | "invalidInput"
  | "invalidCredentials"
  | "invalidCode"
  | "rateLimited"
  | "requestFailed"
  | "checkEmail";

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

export interface EmailVerification {
  email: string;
  token: string;
}

export interface AuthValues {
  email: string;
  password: string;
  code: string;
}

export interface AuthField {
  name: AuthFieldName;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  minLength?: number;
  maxLength: number;
}

export interface AuthFormProps {
  title: string;
  description: string;
  fields: readonly AuthField[];
  values: AuthValues;
  feedback: string | null;
  busy: boolean;
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

export type AuthObserver = (user: AuthUser | null) => void;
