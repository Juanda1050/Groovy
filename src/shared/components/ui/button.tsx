import type { ButtonProps } from "@/models/ui";
import { buttonVariants } from "@/shared/lib/buttonVariants";
import { cn } from "@/shared/lib/utils";
import { Button as ButtonPrimitive } from '@base-ui/react/button';

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
