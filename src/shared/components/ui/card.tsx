import type { CardProps,SurfaceProps } from "@/models/ui";
import { cn } from "@/shared/lib/utils";

export function Card({ className, size = 'default', ...props }: CardProps) {
  return <div data-slot="card" data-size={size} className={cn('flex min-w-0 flex-col gap-6 rounded-2xl border border-border bg-card py-6 text-card-foreground shadow-sm', size === 'sm' && 'gap-4 py-4', className)} {...props} />
}

export function CardHeader({ className, ...props }: SurfaceProps) {
  return <div data-slot="card-header" className={cn('grid gap-2 px-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: SurfaceProps) {
  return <div data-slot="card-title" className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: SurfaceProps) {
  return <div data-slot="card-description" className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: SurfaceProps) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />
}

export function CardFooter({ className, ...props }: SurfaceProps) {
  return <div data-slot="card-footer" className={cn('flex flex-wrap items-center gap-3 border-t border-border px-6 pt-6', className)} {...props} />
}

export function CardAction({ className, ...props }: SurfaceProps) {
  return <div data-slot="card-action" className={cn('justify-self-end', className)} {...props} />
}
