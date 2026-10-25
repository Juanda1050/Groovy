import { Button } from '@/components/ui/button'
import type { LibraryFiltersProps } from '@/models/libraryView'

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
      className="flex min-w-0 flex-wrap items-center gap-1.5"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="
            min-h-10 rounded-full border-border/50
            px-3 py-1.5 text-xs font-medium
            aria-pressed:border-primary/30
            aria-pressed:bg-primary/10
            aria-pressed:text-primary
            sm:min-h-9
          "
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}