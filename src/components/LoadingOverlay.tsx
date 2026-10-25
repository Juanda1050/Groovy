import { AuthLoading } from "@/components/AuthLoading";

import type { LoadingOverlayProps } from "@/models/loading";

export function LoadingOverlay({
  dialogRef,
  onCancel,
  label,
}: LoadingOverlayProps) {
  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      aria-label={label}
      aria-modal="true"
      className="
        fixed inset-0 m-0
        h-dvh max-h-none w-full max-w-none
        overflow-y-auto border-0 bg-background
        p-6 text-foreground
        backdrop:bg-background/80
        backdrop:backdrop-blur-sm
        open:flex open:items-center open:justify-center
        sm:p-8
      "
      style={{
        backgroundImage: `
          radial-gradient(
            ellipse at 25% 20%,
            var(--ambient),
            transparent 65%
          ),
          radial-gradient(
            ellipse at 80% 80%,
            var(--ambient-secondary),
            transparent 60%
          )
        `,
      }}
    >
      <AuthLoading label={label} />
    </dialog>
  );
}
