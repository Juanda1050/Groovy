import { Moon, Sun } from "lucide-react";
import type { ThemeToggleProps } from "@/models/layout";

export function ThemeToggle({ theme, label, onToggle }: ThemeToggleProps) {
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="
        inline-flex size-11 shrink-0 items-center justify-center
        rounded-xl border border-border bg-secondary
        text-secondary-foreground transition-colors
        hover:bg-accent focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
