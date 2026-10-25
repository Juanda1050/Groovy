import { SlidersHorizontal } from "lucide-react";

import type { LibraryFiltersProps } from "@/models/libraryView";

import { Button } from "@/shared/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export function LibraryFilters({
  value,
  options,
  label,
  disabled,
  onChange,
}: LibraryFiltersProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      <div className="w-full min-w-0 sm:hidden">
        <Select
          value={value}
          onValueChange={(next) => {
            const option = options.find((item) => item.value === next);

            if (!disabled && option && option.value !== value) {
              onChange(option.value);
            }
          }}
        >
          <SelectTrigger
            disabled={disabled}
            aria-label={`${label}: ${selectedOption?.label ?? ""}`}
            className="min-h-12 w-full min-w-0 rounded-xl border-border bg-card px-3"
          >
            <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
              <SlidersHorizontal aria-hidden="true" className="size-4" />

              <span className="text-xs font-medium">{label}</span>
            </span>

            <SelectValue className="min-w-0 flex-1 text-right text-sm">
              {selectedOption?.label ?? label}
            </SelectValue>
          </SelectTrigger>

          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        role="group"
        aria-label={label}
        className="hidden min-w-0 flex-wrap items-center gap-1.5 sm:flex"
      >
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => {
              if (!disabled && option.value !== value) {
                onChange(option.value);
              }
            }}
            className="min-h-11 rounded-lg px-3 py-1.5 text-xs font-medium aria-pressed:bg-primary/10 aria-pressed:text-primary"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </>
  );
}
