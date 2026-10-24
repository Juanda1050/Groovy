import { Button } from "@/components/ui/button";
import { RecordLoader } from "./RecordLoader";
import type { LoadingButtonProps } from "@/models/loading";

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

      <span aria-live="polite">{loading ? loadingLabel : children}</span>
    </Button>
  );
}
