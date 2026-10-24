import { AuthLoading } from "./AuthLoading";
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
        dark fixed inset-0 m-0
        h-dvh max-h-none w-screen max-w-none
        border-0 bg-transparent p-0 text-foreground
        backdrop:bg-black/75 backdrop:backdrop-blur-sm
        open:flex open:items-center open:justify-center
      "
    >
      <AuthLoading label={label} />
    </dialog>
  );
}
