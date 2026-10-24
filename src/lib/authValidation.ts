import { z } from "zod";
import { getPasswordChecks, isPasswordLengthAllowed } from "./passwordPolicy";
import type {
  AuthFieldErrors,
  AuthFieldName,
  AuthMode,
  AuthValues,
} from "@/models/auth";

const emailSchema = z.email({ error: "email" }).max(254, { error: "email" });

const newPasswordSchema = z
  .string()
  .min(12, { error: "passwordRequirements" })
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
    .max(1024, { error: "passwordTooLong" }),
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

export const verificationSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6,10}$/, { error: "code" }),
});

function isAuthField(value: unknown): value is AuthFieldName {
  return (
    value === "email" ||
    value === "password" ||
    value === "confirmPassword" ||
    value === "code"
  );
}

export function validateAuthValues(
  mode: AuthMode,
  values: AuthValues,
): AuthFieldErrors {
  const input = {
    ...values,
    email: values.email.trim(),
    code: values.code.trim(),
  };

  const schema =
    mode === "signUp"
      ? signUpSchema
      : mode === "verify"
        ? verificationSchema
        : signInSchema;

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
