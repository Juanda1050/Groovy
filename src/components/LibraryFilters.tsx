import { Button } from "@/components/ui/button";
import type { LibraryFiltersProps } from "@/models/libraryView";

export function LibraryFilters({
  value,
  options,
  label,
  disabled,
  onChange,
}: LibraryFiltersProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "secondary" : "ghost"}
          size="sm"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="sm:min-h-9"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
