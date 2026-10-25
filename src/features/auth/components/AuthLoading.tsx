import type { AuthLoadingProps } from "@/models/auth";
import { RecordLoader } from "@/shared/components/RecordLoader";

export function AuthLoading({ label }: AuthLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="
        flex min-h-64 w-full items-center
        justify-center px-6 py-10 sm:min-h-80
      "
    >
      <RecordLoader size="lg" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
