import type { RecordLoaderProps } from "@/models/auth";
import { cn } from "@/shared/lib/utils";

export function RecordLoader({ size = "sm" }: RecordLoaderProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 64"
      className={cn(
        "inline-block shrink-0",
        "motion-safe:animate-[spin_2.8s_linear_infinite]",
        size === "lg" ? "size-16" : "size-5",
      )}
    >
      <circle cx="32" cy="32" r="30" className="fill-primary" />

      <g
        fill="none"
        strokeWidth="0.75"
        className="stroke-primary-foreground/25"
      >
        <circle cx="32" cy="32" r="26" />
        <circle cx="32" cy="32" r="23" />
        <circle cx="32" cy="32" r="20" />
        <circle cx="32" cy="32" r="17" />
      </g>

      <g
        fill="none"
        strokeLinecap="round"
        className="stroke-primary-foreground/50"
      >
        <path d="M 12 28 A 21 21 0 0 1 27 12" strokeWidth="2" />
        <path d="M 15 29 A 18 18 0 0 1 28 15" strokeWidth="1" />
        <path d="M 52 36 A 21 21 0 0 1 37 52" strokeWidth="2" />
        <path d="M 49 35 A 18 18 0 0 1 36 49" strokeWidth="1" />
      </g>

      <circle cx="32" cy="32" r="12" className="fill-background" />
      <circle
        cx="32"
        cy="32"
        r="9"
        fill="none"
        strokeWidth="0.75"
        className="stroke-primary/40"
      />
      <path
        d="M 27 27 H 37"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-primary"
      />
      <circle cx="32" cy="32" r="2.5" className="fill-primary" />
    </svg>
  );
}
