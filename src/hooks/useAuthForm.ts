import { useRef, useState } from "react";
import { AuthError } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import {
  signInSchema,
  signUpSchema,
  verificationSchema,
} from "@/lib/authValidation";
import { signIn, signUp, verifyEmail } from "@/services/authService";
import type {
  AuthFeedback,
  AuthField,
  AuthFieldName,
  AuthMode,
  AuthValues,
} from "@/models/auth";

export function useAuthForm() {
  const { t } = useTranslation("auth");
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [values, setValues] = useState<AuthValues>({
    email: "",
    password: "",
    code: "",
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const submitting = useRef(false);

  const fields: AuthField[] = [
    {
      name: "email",
      label: t("fields.email"),
      type: "email",
      autoComplete: "email",
      maxLength: 254,
    },
  ];

  if (mode === "verify") {
    fields.push({
      name: "code",
      label: t("fields.code"),
      type: "text",
      autoComplete: "one-time-code",
      minLength: 6,
      maxLength: 10,
    });
  } else {
    fields.push({
      name: "password",
      label: t("fields.password"),
      type: "password",
      autoComplete: mode === "signUp" ? "new-password" : "current-password",
      minLength: mode === "signUp" ? 12 : 1,
      maxLength: 128,
    });
  }

  function onChange(name: AuthFieldName, value: string): void {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function onSwitch(): void {
    if (submitting.current) return;

    setMode((current) => (current === "signIn" ? "signUp" : "signIn"));
    setValues((current) => ({
      ...current,
      password: "",
      code: "",
    }));
    setFeedback(null);
  }

  async function onSubmit(): Promise<void> {
    if (submitting.current) return;

    const credentials = {
      email: values.email.trim(),
      password: values.password,
    };

    const validation =
      mode === "verify"
        ? verificationSchema.safeParse({
            email: credentials.email,
            token: values.code.trim(),
          })
        : (mode === "signUp" ? signUpSchema : signInSchema).safeParse(
            credentials,
          );

    if (!validation.success) {
      setFeedback("invalidInput");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setFeedback(null);

    try {
      if (mode === "signIn") {
        await signIn(credentials);
      } else if (mode === "signUp") {
        await signUp(credentials);
        setMode("verify");
        setValues((current) => ({
          ...current,
          password: "",
          code: "",
        }));
        setFeedback("checkEmail");
      } else {
        await verifyEmail({
          email: credentials.email,
          token: values.code.trim(),
        });
      }
    } catch (error: unknown) {
      if (error instanceof AuthError && error.status === 429) {
        setFeedback("rateLimited");
      } else if (mode === "signIn") {
        setFeedback("invalidCredentials");
      } else if (mode === "verify") {
        setFeedback("invalidCode");
      } else {
        setFeedback("requestFailed");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return {
    fields,
    values,
    busy,
    onChange,
    onSubmit,
    onSwitch,
    title: t(`${mode}.title`),
    description: t(`${mode}.description`),
    submitLabel: busy ? t("submitting") : t(`${mode}.submit`),
    switchLabel: t(mode === "signIn" ? "switchToSignUp" : "switchToSignIn"),
    feedback: feedback ? t(`feedback.${feedback}`) : null,
  };
}
