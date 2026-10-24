import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthFeedback } from "@/lib/authErrors";
import { validateAuthValues } from "@/lib/authValidation";
import { signIn, signUp, verifyEmail } from "@/services/authService";
import { usePasswordRules } from "./usePasswordRules";
import type {
  AuthFeedback,
  AuthField,
  AuthFieldErrors,
  AuthFieldName,
  AuthFormProps,
  AuthMode,
  AuthValues,
} from "@/models/auth";

export function useAuthForm(): AuthFormProps {
  const { t } = useTranslation("auth");
  const [mode, setMode] = useState<AuthMode>("signIn");

  const [values, setValues] = useState<AuthValues>({
    email: "",
    password: "",
    confirmPassword: "",
    code: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const submitting = useRef(false);
  const passwordRules = usePasswordRules(values.password);

  const validation = validateAuthValues(mode, values);
  const isValid = Object.keys(validation).length === 0;

  const fields: AuthField[] = [
    {
      name: "email",
      label: t("fields.email"),
      type: "email",
      autoComplete: "email",
      inputMode: "email",
      maxLength: 254,
    },
  ];

  if (mode === "verify") {
    fields.push({
      name: "code",
      label: t("fields.code"),
      type: "text",
      autoComplete: "one-time-code",
      inputMode: "numeric",
      minLength: 6,
      maxLength: 10,
    });
  } else {
    fields.push({
      name: "password",
      label: t("fields.password"),
      type: passwordVisible ? "text" : "password",
      autoComplete: mode === "signUp" ? "new-password" : "current-password",
      maxLength: mode === "signUp" ? 72 : 1024,
      visibilityLabel: t(passwordVisible ? "password.hide" : "password.show"),
      onToggleVisibility: () => {
        setPasswordVisible((current) => !current);
      },
    });

    if (mode === "signUp") {
      fields.push({
        name: "confirmPassword",
        label: t("fields.confirmPassword"),
        type: confirmationVisible ? "text" : "password",
        autoComplete: "new-password",
        maxLength: 72,
        visibilityLabel: t(
          confirmationVisible ? "password.hide" : "password.show",
        ),
        onToggleVisibility: () => {
          setConfirmationVisible((current) => !current);
        },
      });
    }
  }

  function onChange(name: AuthFieldName, value: string): void {
    setValues((current) => ({ ...current, [name]: value }));
    setFeedback(null);
  }

  function onSwitch(): void {
    if (submitting.current) return;

    setMode((current) => (current === "signIn" ? "signUp" : "signIn"));

    setValues((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
      code: "",
    }));

    setSubmitted(false);
    setFeedback(null);
    setPasswordVisible(false);
    setConfirmationVisible(false);
  }

  async function onSubmit(): Promise<void> {
    if (submitting.current) return;

    setSubmitted(true);

    // Comprobación adicional aunque el botón esté desactivado.
    const errors = validateAuthValues(mode, values);

    if (Object.keys(errors).length > 0) return;

    submitting.current = true;
    setBusy(true);
    setFeedback(null);

    const credentials = {
      email: values.email.trim(),
      password: values.password,
    };

    try {
      if (mode === "signIn") {
        await signIn(credentials);
      } else if (mode === "signUp") {
        await signUp(credentials);

        setMode("verify");
        setSubmitted(false);
        setPasswordVisible(false);
        setConfirmationVisible(false);

        setValues((current) => ({
          ...current,
          password: "",
          confirmPassword: "",
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
      setFeedback(getAuthFeedback(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const fieldErrors: AuthFieldErrors = {};

  if (submitted) {
    for (const field of fields) {
      const key = validation[field.name];

      if (key) {
        fieldErrors[field.name] = t(`errors.${key}`);
      }
    }
  }

  return {
    fields,
    values,
    fieldErrors,
    passwordRules: mode === "signUp" ? passwordRules : null,
    busy,
    canSubmit: isValid && !busy,
    onChange,
    onSubmit,
    onSwitch,
    title: t(`${mode}.title`),
    description: t(`${mode}.description`),
    submitLabel: t(`${mode}.${busy ? "pending" : "submit"}`),
    switchLabel: t(mode === "signIn" ? "switchToSignUp" : "switchToSignIn"),
    feedback: feedback ? t(`feedback.${feedback}`) : null,
    feedbackTone: feedback === "checkEmail" ? "info" : "error",
  };
}
