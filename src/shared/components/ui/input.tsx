import type { InputProps } from "@/models/ui";
import { cn } from "@/shared/lib/utils";
import { Input as InputPrimitive } from '@base-ui/react/input';

export function Input({ className, ...props }: InputProps) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        'min-h-12 w-full min-w-0 rounded-xl border border-input bg-background/70 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/75 transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}
