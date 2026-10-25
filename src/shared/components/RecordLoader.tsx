import type { RecordLoaderProps } from "@/models/auth";
import { cn } from "@/shared/lib/utils";

export function RecordLoader({ size = "sm" }: RecordLoaderProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        "overflow-hidden rounded-full border border-border",
        "bg-card",
        "motion-safe:animate-[spin_2s_linear_infinite]",
        size === "lg" ? "size-36 shadow-xl sm:size-48" : "size-6",
      )}
    >
      <span className="absolute inset-[8%] rounded-full border border-primary/20" />
      <span className="absolute inset-[16%] rounded-full border border-primary/15" />
      <span className="absolute inset-[24%] rounded-full border border-primary/20" />

      <span className="absolute left-[46%] top-[8%] h-[12%] w-[5%] rounded-full bg-primary/60" />

      <span className="relative grid size-[34%] place-items-center rounded-full bg-primary">
        <span className="size-[15%] rounded-full bg-primary-foreground" />
      </span>
    </span>
  );
}
