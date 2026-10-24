import type { LabelProps } from '@/models/ui'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: LabelProps) {
  return <label data-slot="label" className={cn('block text-sm font-medium leading-6 text-foreground', className)} {...props} />
}
