import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import type { LanguageSelectorProps } from "@/models/language";
import type { SupportedLanguage } from "@/models/preferences";

const flags = {
  en: "🇺🇸",
  es: "🇪🇸",
} as const;

export function LanguageSelector({
  value,
  options,
  label,
  disabled,
  onChange,
}: LanguageSelectorProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <Select<SupportedLanguage>
      value={value}
      disabled={disabled}
      items={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      onValueChange={(language) => {
        if (language !== null && language !== value) {
          void onChange(language);
        }
      }}
    >
      <SelectPrimitive.Trigger
        aria-label={`${label}: ${selectedLabel ?? value}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border/50 bg-transparent px-3 text-xs font-medium disabled:opacity-50"
      >
        <span aria-hidden="true" className="text-base">
          {flags[value]}
        </span>
        <span>{value.toUpperCase()}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 text-muted-foreground"
        />
      </SelectPrimitive.Trigger>

      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">{flags[option.value]}</span>
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
