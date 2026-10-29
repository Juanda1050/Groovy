import { AuthLoading } from "@/features/auth/components/AuthLoading";
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
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-6 text-foreground outline-none backdrop:bg-background/80 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center"
    >
      <AuthLoading label={label} />
    </dialog>
  );
}
