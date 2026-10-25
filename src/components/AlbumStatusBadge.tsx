import { Check, Clock3 } from "lucide-react";
import type { AlbumStatusBadgeProps } from "@/models/albumDetail";

export function AlbumStatusBadge({ status, label }: AlbumStatusBadgeProps) {
  const pending = status === "pending";
  const Icon = pending ? Clock3 : Check;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium backdrop-blur-md ${
        pending
          ? "border-amber-300/30 bg-amber-950/85 text-amber-100"
          : "border-primary/30 bg-background/95 text-primary"
      }`}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {label}
    </span>
  );
}
