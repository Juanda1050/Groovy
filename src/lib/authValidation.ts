import { z } from "zod";
import type {
  AuthFieldErrors,
  AuthFieldName,
  AuthMode,
  AuthValues,
  PasswordCheck,
  PasswordStatus,
} from "@/models/auth";

export const passwordMinLength = 12;
export const passwordMaxBytes = 72;
export const signInPasswordMaxLength = 1024;

const specialCharacters = "!@#$%^&*()_+-=[]{};':\"\\|<>?,./`~";

export function isPasswordLengthAllowed(password: string): boolean {
  return new TextEncoder().encode(password).length <= passwordMaxBytes;
}

export function getPasswordChecks(password: string): readonly PasswordCheck[] {
  return [
    {
      id: "length",
      passed: password.length >= passwordMinLength,
    },
    {
      id: "lowercase",
      passed: /[a-z]/.test(password),
    },
    {
      id: "uppercase",
      passed: /[A-Z]/.test(password),
    },
    {
      id: "number",
      passed: /[0-9]/.test(password),
    },
    {
      id: "special",
      passed: [...specialCharacters].some((character) =>
        password.includes(character),
      ),
    },
  ];
}

export function getPasswordStatus(
  password: string,
  checks: readonly PasswordCheck[] = getPasswordChecks(password),
): PasswordStatus {
  if (!password) return "empty";
  if (!isPasswordLengthAllowed(password)) return "invalid";

  const passed = checks.filter((check) => check.passed).length;

  if (passed === checks.length) return "valid";
  if (passed >= 3) return "partial";

  return "invalid";
}

const emailSchema = z.email({ error: "email" }).max(254, {
  error: "email",
});

const newPasswordSchema = z
  .string()
  .min(passwordMinLength, { error: "passwordRequirements" })
  .refine(isPasswordLengthAllowed, {
    message: "passwordTooLong",
  })
  .refine(
    (password) => getPasswordChecks(password).every((check) => check.passed),
    {
      message: "passwordRequirements",
    },
  );

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, { error: "required" })
    .max(signInPasswordMaxLength, { error: "passwordTooLong" }),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, { error: "required" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });

function isAuthField(value: unknown): value is AuthFieldName {
  return (
    value === "email" || value === "password" || value === "confirmPassword"
  );
}

export function validateAuthValues(
  mode: AuthMode,
  values: AuthValues,
): AuthFieldErrors {
  const input = {
    ...values,
    email: values.email.trim(),
  };

  const schema = mode === "signUp" ? signUpSchema : signInSchema;
  const result = schema.safeParse(input);
  const errors: AuthFieldErrors = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];

      if (isAuthField(field) && !errors[field]) {
        errors[field] = issue.message;
      }
    }
  }

  return errors;
}
