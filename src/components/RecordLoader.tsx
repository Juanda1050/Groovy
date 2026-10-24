import { cn } from "@/lib/utils";
import type { RecordLoaderProps } from "@/models/auth";

export function RecordLoader({ size = "sm" }: RecordLoaderProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        "overflow-hidden rounded-full border border-[#436381]",
        "bg-[#071426]",
        "motion-safe:animate-[spin_2s_linear_infinite]",
        size === "lg" ? "size-36 shadow-xl sm:size-48" : "size-6",
      )}
    >
      <span
        className="
          absolute inset-[8%] rounded-full
          border border-[#436381]/60
        "
      />

      <span
        className="
          absolute inset-[16%] rounded-full
          border border-[#436381]/40
        "
      />

      <span
        className="
          absolute inset-[24%] rounded-full
          border border-[#436381]/60
        "
      />

      <span
        className="
          absolute left-[46%] top-[8%]
          h-[12%] w-[5%] rounded-full
          bg-[#77c4ff]/60
        "
      />

      <span
        className="
          relative grid size-[34%] place-items-center
          rounded-full bg-linear-to-br
          from-[#b0e0ff] to-[#57b6ff]
        "
      >
        <span className="size-[15%] rounded-full bg-[#071426]" />
      </span>
    </span>
  );
}
