import type { SelectContentProps,SelectGroupProps,SelectItemProps,SelectLabelProps,SelectScrollDownProps,SelectScrollUpProps,SelectSeparatorProps,SelectTriggerProps,SelectValueProps } from "@/models/select";
import { cn } from "@/shared/lib/utils";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check,ChevronDown,ChevronUp } from "lucide-react";

const Select = SelectPrimitive.Root;

function SelectGroup({ className, ...props }: SelectGroupProps) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("p-1", className)}
      {...props}
    />
  );
}

function SelectValue({ className, ...props }: SelectValueProps) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("min-w-0 truncate text-left", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "default",
  variant = "outline",
  children,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      data-variant={variant}
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-between",
        "gap-2 rounded-lg border text-sm font-medium",
        "whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        size === "sm"
          ? "min-h-11 px-2.5 py-1.5 sm:min-h-9"
          : "min-h-11 px-3 py-2",
        variant === "ghost"
          ? [
              "border-transparent bg-transparent",
              "text-muted-foreground",
              "hover:bg-accent/60 hover:text-foreground",
            ]
          : [
              "border-input bg-background/60 text-foreground",
              "hover:border-primary/60",
            ],
        className,
      )}
      {...props}
    >
      {children}

      <SelectPrimitive.Icon>
        <ChevronDown aria-hidden="true" className="size-3.5 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative min-w-36 w-(--anchor-width)",
            "max-h-[min(var(--available-height),18rem)]",
            "overflow-x-hidden overflow-y-auto",
            "rounded-xl border border-border/70",
            "bg-popover p-1 text-popover-foreground",
            "shadow-[0_8px_28px_rgb(0_12_30/18%)]",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />

          <SelectPrimitive.List>{children}</SelectPrimitive.List>

          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        "px-3 py-2 text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-11 w-full cursor-default",
        "items-center gap-2 rounded-lg py-2 pl-3 pr-8",
        "text-sm select-none outline-none sm:min-h-9",
        "data-highlighted:bg-accent",
        "data-highlighted:text-accent-foreground",
        "data-selected:font-medium data-selected:text-primary",
        "data-disabled:pointer-events-none",
        "data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>

      <SelectPrimitive.ItemIndicator
        className="
          pointer-events-none absolute right-3
          flex items-center justify-center
        "
      >
        <Check aria-hidden="true" className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none mx-2 my-1 h-px bg-border/60",
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: SelectScrollUpProps) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "sticky top-0 z-10 flex items-center",
        "justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronUp aria-hidden="true" className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: SelectScrollDownProps) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "sticky bottom-0 z-10 flex items-center",
        "justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronDown aria-hidden="true" className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
Select,
SelectContent,
SelectGroup,
SelectItem,
SelectLabel,
SelectScrollDownButton,
SelectScrollUpButton,
SelectSeparator,
SelectTrigger,
SelectValue
};
