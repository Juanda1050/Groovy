import { useTranslation } from "react-i18next";
import { getPasswordChecks, getPasswordStatus } from "@/lib/passwordPolicy";
import type { PasswordRulesProps } from "@/models/auth";

export function usePasswordRules(password: string): PasswordRulesProps {
  const { t } = useTranslation("auth");
  const status = getPasswordStatus(password);

  return {
    status,
    heading: t("password.heading"),
    label: t(`password.status.${status}`),
    checks: getPasswordChecks(password).map((check) => ({
      ...check,
      label: t(`password.rules.${check.id}`),
    })),
  };
}
