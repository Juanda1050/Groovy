import { Popover } from "@base-ui/react/popover";
import { Check,Menu } from "lucide-react";
import { useState } from "react";

import type { LibraryFiltersProps } from "@/models/libraryView";
import { Button } from "@/shared/components/ui/button";

export function LibraryFilters({
  value,
  options,
  label,
  disabled,
  onChange,
}: LibraryFiltersProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  function selectFilter(nextValue: typeof value) {
    if (disabled) return;

    if (nextValue !== value) {
      onChange(nextValue);
    }

    setOpen(false);
  }

  return (
    <>
      <div className="min-w-0 sm:hidden">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            type="button"
            disabled={disabled}
            aria-label={`${label}: ${selectedOption?.label ?? ""}`}
            className="
              inline-flex min-h-11 max-w-full items-center
              gap-2.5 rounded-xl border border-border
              bg-card px-3 text-sm font-medium text-foreground
              transition-colors hover:bg-accent
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              disabled:pointer-events-none disabled:opacity-50
              data-popup-open:border-primary/40
              data-popup-open:bg-primary/10
            "
          >
            <Menu aria-hidden="true" className="size-4 shrink-0 text-primary" />

            <span className="truncate">{selectedOption?.label ?? label}</span>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner
              side="bottom"
              align="start"
              sideOffset={8}
              collisionPadding={16}
              className="z-50 sm:hidden"
            >
              <Popover.Popup
                className="
                  w-64 max-w-[calc(100vw-2rem)]
                  origin-(--transform-origin)
                  rounded-2xl border border-border
                  bg-popover p-1.5 text-popover-foreground
                  shadow-xl outline-none
                  transition-[opacity,transform] duration-150
                  data-starting-style:scale-95
                  data-starting-style:opacity-0
                  data-ending-style:scale-95
                  data-ending-style:opacity-0
                  motion-reduce:transition-none
                "
              >
                <Popover.Title
                  className="
                    px-3 pb-2 pt-2 text-xs
                    font-medium text-muted-foreground
                  "
                >
                  {label}
                </Popover.Title>

                <div role="group" aria-label={label} className="space-y-1">
                  {options.map((option) => {
                    const selected = value === option.value;

                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="ghost"
                        disabled={disabled}
                        aria-pressed={selected}
                        onClick={() => selectFilter(option.value)}
                        className="
                          min-h-11 w-full justify-between
                          gap-3 rounded-xl px-3 text-sm
                          font-normal
                          aria-pressed:bg-primary/10
                          aria-pressed:font-medium
                          aria-pressed:text-primary
                        "
                      >
                        <span className="truncate">{option.label}</span>

                        {selected && (
                          <Check
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <div
        role="group"
        aria-label={label}
        className="
          hidden min-w-0 flex-wrap
          items-center gap-1.5 sm:flex
        "
      >
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => selectFilter(option.value)}
            className="
              min-h-9 rounded-full px-3 py-1.5
              text-xs font-medium
              aria-pressed:bg-primary/10
              aria-pressed:text-primary
            "
          >
            {option.label}
          </Button>
        ))}
      </div>
    </>
  );
}
