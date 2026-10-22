import { cn } from "@/lib/utils";
import type { GlassPanelProps } from "@/models/layout";

export function GlassPanel({
  blur = false,
  className,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn("glassPanel rounded-2xl", blur && "glassBlur", className)}
      {...props}
    />
  );
}
