import type { AlertProps, SurfaceProps } from '@/models/ui'
import { cn } from '@/lib/utils'

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return <div data-slot="alert" role="alert" className={cn('relative rounded-xl border px-4 py-3 text-sm leading-relaxed', variant === 'destructive' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-muted text-foreground', className)} {...props} />
}

export function AlertTitle({ className, ...props }: SurfaceProps) {
  return <div data-slot="alert-title" className={cn('mb-1 font-semibold', className)} {...props} />
}

export function AlertDescription({ className, ...props }: SurfaceProps) {
  return <div data-slot="alert-description" className={cn('text-inherit [overflow-wrap:anywhere]', className)} {...props} />
}

export function AlertAction({ className, ...props }: SurfaceProps) {
  return <div data-slot="alert-action" className={cn('mt-3', className)} {...props} />
}
