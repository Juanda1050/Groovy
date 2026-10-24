import type { PasswordCheck, PasswordStatus } from "@/models/auth";

const specialCharacters = "!@#$%^&*()_+-=[]{};':\"\\|<>?,./`~";

export function isPasswordLengthAllowed(password: string): boolean {
  return new TextEncoder().encode(password).length <= 72;
}

export function getPasswordChecks(password: string): readonly PasswordCheck[] {
  return [
    {
      id: "length",
      passed: password.length >= 12,
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

export function getPasswordStatus(password: string): PasswordStatus {
  if (!password) return "empty";
  if (!isPasswordLengthAllowed(password)) return "invalid";

  const checks = getPasswordChecks(password);
  const passed = checks.filter((check) => check.passed).length;

  if (passed === checks.length) return "valid";
  if (passed >= 3) return "partial";

  return "invalid";
}
