import { Button } from "@/components/ui/button";
import type { LanguageSelectorProps } from "@/models/language";

export function LanguageSelector({
  value,
  options,
  label,
  disabled,
  onChange,
}: LanguageSelectorProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="
        grid grid-cols-2 gap-2
        rounded-2xl border border-border
        bg-background/60 p-2
      "
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "default" : "ghost"}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => void onChange(option.value)}
          className="min-w-0 rounded-xl px-3"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
