import { Button as ButtonPrimitive } from "@base-ui/react/button";

import type { ButtonProps } from "@/models/ui";

import { buttonSizes, buttonVariants } from "@/shared/lib/buttonVariants";

import { cn } from "@/shared/lib/utils";

export function Button({ className, variant, size, ...props }: ButtonProps) {
  const resolvedSize = size ?? "default";

  return (
    <ButtonPrimitive
      data-slot="button"
      data-size={resolvedSize}
      className={cn(
        buttonVariants({
          variant,
          size: resolvedSize,
        }),
        className,
        buttonSizes[resolvedSize],
      )}
      {...props}
    />
  );
}
