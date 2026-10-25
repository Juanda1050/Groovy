import type { SurfaceProps } from "@/models/ui";
import { cn } from "@/shared/lib/utils";

export function Skeleton({ className, ...props }: SurfaceProps) {
  return <div data-slot="skeleton" className={cn('rounded-lg bg-muted motion-safe:animate-pulse', className)} {...props} />
}
