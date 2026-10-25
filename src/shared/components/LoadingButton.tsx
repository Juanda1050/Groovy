import type { LoadingButtonProps } from "@/models/loading";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";

export function LoadingButton({
  loading,
  loadingLabel,
  disabled = false,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button {...props} disabled={disabled || loading} aria-busy={loading}>
      {loading && <RecordLoader size="sm" />}

      <span
        aria-live="polite"
        className="inline-flex min-w-0 items-center justify-center gap-2"
      >
        {loading ? loadingLabel : children}
      </span>
    </Button>
  );
}
