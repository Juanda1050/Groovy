import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThemeToggleProps } from "@/models/layout";

export function ThemeToggle({ theme, label, onToggle }: ThemeToggleProps) {
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="
        size-11 shrink-0 rounded-xl
        border-border bg-background/70
      "
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  );
}
