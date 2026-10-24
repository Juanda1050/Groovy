import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PasswordRulesProps } from "@/models/auth";

export function PasswordRules({
  checks,
  status,
  label,
  heading,
}: PasswordRulesProps) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{heading}</p>

        <span
          className={cn(
            "text-xs font-medium",
            status === "empty" && "text-muted-foreground",
            status === "invalid" && "text-destructive",
            status === "partial" && "text-amber-700 dark:text-amber-300",
            status === "valid" && "text-emerald-700 dark:text-emerald-300",
          )}
        >
          {label}
        </span>
      </div>

      <div aria-hidden="true" className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((segment) => (
          <span
            key={segment}
            className={cn(
              "h-1 rounded-full bg-muted",
              status === "invalid" && segment === 0 && "bg-destructive",
              status === "partial" && segment < 2 && "bg-amber-500",
              status === "valid" && "bg-emerald-500",
            )}
          />
        ))}
      </div>

      <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
        {checks.map((check) => {
          const Icon = check.passed ? Check : Minus;

          return (
            <li
              key={check.id}
              className={cn(
                "flex items-center gap-2 leading-5",
                check.passed
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-3 shrink-0" />
              <span>{check.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
