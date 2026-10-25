import type { TextareaProps } from "@/models/ui";
import { cn } from "@/shared/lib/utils";

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "block min-h-24 w-full min-w-0 resize-y rounded-xl",
        "border border-input bg-background/40 px-3 py-2.5",
        "text-base leading-6 text-foreground sm:text-sm",
        "placeholder:text-muted-foreground/60",
        "transition-colors hover:border-primary/40",
        "focus-visible:border-primary/60 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
