import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getPasswordChecks,
  getPasswordStatus,
  passwordMaxBytes,
  signInPasswordMaxLength,
  validateAuthValues,
} from "@/features/auth/lib/authValidation";

import {
  getAuthFeedback,
  signIn,
  signUp,
} from "@/features/auth/services/authService";

import type {
  AuthFeedback,
  AuthField,
  AuthFieldErrors,
  AuthFieldName,
  AuthFormProps,
  AuthMode,
  AuthValues,
  PasswordRulesProps,
} from "@/models/auth";

export function useAuthForm(): AuthFormProps {
  const { t } = useTranslation("auth");

  const [mode, setMode] = useState<AuthMode>("signIn");

  const [values, setValues] = useState<AuthValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const submitting = useRef(false);

  const checks = getPasswordChecks(values.password);
  const passwordStatus = getPasswordStatus(values.password, checks);
  const validation = validateAuthValues(mode, values);
  const isValid = Object.keys(validation).length === 0;

  const passwordRules: PasswordRulesProps = {
    status: passwordStatus,
    heading: t("password.heading"),
    label: t(`password.status.${passwordStatus}`),
    checks: checks.map((check) => ({
      ...check,
      label: t(`password.rules.${check.id}`),
    })),
  };

  const fields: AuthField[] = [
    {
      name: "email",
      label: t(mode === "signIn" ? "fields.identifier" : "fields.email"),
      type: mode === "signIn" ? "text" : "email",
      autoComplete: mode === "signIn" ? "username" : "email",
      inputMode: mode === "signIn" ? "text" : "email",
      maxLength: 254,
    },
    {
      name: "password",
      label: t("fields.password"),
      type: passwordVisible ? "text" : "password",
      autoComplete: mode === "signUp" ? "new-password" : "current-password",
      maxLength: mode === "signUp" ? passwordMaxBytes : signInPasswordMaxLength,
      visibilityLabel: t(passwordVisible ? "password.hide" : "password.show"),
      onToggleVisibility: () => {
        setPasswordVisible((current) => !current);
      },
    },
  ];

  if (mode === "signUp") {
    fields.push({
      name: "confirmPassword",
      label: t("fields.confirmPassword"),
      type: confirmationVisible ? "text" : "password",
      autoComplete: "new-password",
      maxLength: passwordMaxBytes,
      visibilityLabel: t(
        confirmationVisible ? "password.hide" : "password.show",
      ),
      onToggleVisibility: () => {
        setConfirmationVisible((current) => !current);
      },
    });
  }

  function clearPasswords(): void {
    setValues((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));

    setPasswordVisible(false);
    setConfirmationVisible(false);
    setSubmitted(false);
  }

  function onChange(name: AuthFieldName, value: string): void {
    if (submitting.current) return;

    setValues((current) => ({
      ...current,
      [name]: value,
    }));

    setFeedback(null);
  }

  function onSwitch(): void {
    if (submitting.current) return;

    setMode((current) => (current === "signIn" ? "signUp" : "signIn"));

    clearPasswords();
    setFeedback(null);
  }

  async function onSubmit(): Promise<void> {
    if (submitting.current) return;

    setSubmitted(true);

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
      } else {
        await signUp(credentials);
      }

      clearPasswords();
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
    feedbackTone: "error",
  };
}
