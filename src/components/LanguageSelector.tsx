import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { buttonVariants } from "@/lib/buttonVariants";
import type { LanguageSelectorProps } from "@/models/language";
import type { SupportedLanguage } from "@/models/preferences";

export function LanguageSelector({
  value,
  options,
  label,
  disabled,
  onChange,
}: LanguageSelectorProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label;

  const accessibleLabel = selectedLabel ? `${label}: ${selectedLabel}` : label;

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
        aria-label={accessibleLabel}
        title={accessibleLabel}
        className={buttonVariants({
          variant: "outline",
          size: "icon",
        })}
      >
        <Languages aria-hidden="true" className="size-4" />
      </SelectPrimitive.Trigger>

      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
