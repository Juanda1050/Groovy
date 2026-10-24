import { Button as ButtonPrimitive } from '@base-ui/react/button'
import type { ButtonProps } from '@/models/ui'
import { buttonVariants } from '@/lib/buttonVariants'
import { cn } from '@/lib/utils'

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
