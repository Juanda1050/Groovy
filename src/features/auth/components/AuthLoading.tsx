import type { AuthLoadingProps } from "@/models/auth";
import { RecordLoader } from "@/shared/components/RecordLoader";

export function AuthLoading({ label }: AuthLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex min-h-48 w-full items-center justify-center"
    >
      <RecordLoader size="lg" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
