import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useTranslation } from "react-i18next";
import { LoadingButton } from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import type { AlbumConfirmationProps } from "@/models/albumConfirmation";

export function AlbumConfirmation({
  open,
  saving,
  disabled,
  errorKey,
  remainingSeconds,
  onOpenChange,
  onConfirm,
}: AlbumConfirmationProps) {
  const { t } = useTranslation("rating");

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />

        <AlertDialog.Popup
          aria-busy={saving}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-popover p-5 text-popover-foreground shadow-2xl outline-none sm:p-6"
        >
          <AlertDialog.Title className="text-base font-semibold tracking-tight">
            {t("confirmation.title")}
          </AlertDialog.Title>

          <AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("confirmation.description")}
          </AlertDialog.Description>

          {errorKey && (
            <p role="alert" className="mt-4 text-xs leading-5 text-destructive">
              {t(errorKey)}
            </p>
          )}

          {remainingSeconds > 0 && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {t("retryAfter", { count: remainingSeconds })}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>

            <LoadingButton
              type="button"
              className="min-h-11"
              loading={saving}
              loadingLabel={t("saving")}
              disabled={disabled}
              onClick={onConfirm}
            >
              {t("confirmation.confirm")}
            </LoadingButton>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
