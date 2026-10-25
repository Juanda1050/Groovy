import { useId, useState } from "react";
import { BookmarkPlus, Check, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AlbumConfirmation } from "@/components/AlbumConfirmation";
import { AlbumRating } from "@/components/AlbumRating";
import { RecordLoader } from "@/components/RecordLoader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAlbumStatus } from "@/hooks/useAlbumStatus";
import { useAuthStore } from "@/stores/authStore";
import type { AlbumStatusProps } from "@/models/albumDetail";
import { AlbumReview } from '@/components/AlbumReview';

export function AlbumStatus({ albumId }: AlbumStatusProps) {
  const { t } = useTranslation("rating");
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const status = useAlbumStatus(albumId);
  const labelId = useId();

  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmationSubmitted, setConfirmationSubmitted] = useState(false);

  const pending = status.currentStatus === "pending";
  const listened = status.currentStatus === "listened";
  const dialogOpen = confirmPending && listened;

  if (status.loading) {
    return (
      <div
        role="status"
        className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"
      >
        <RecordLoader size="sm" />
        {t("status.loading")}
      </div>
    );
  }

  if (status.readError) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p role="alert" className="text-xs text-muted-foreground">
          {t("status.readError")}
        </p>

        <Button
          type="button"
          variant="ghost"
          className="min-h-11 px-2 text-xs"
          disabled={status.reading}
          onClick={status.onRetry}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  const Icon = pending ? Clock : listened ? Check : BookmarkPlus;

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-2">
        <span id={labelId} className="sr-only">
          {t("status.label")}
        </span>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Select
            value={status.currentStatus}
            onValueChange={(value) => {
              if (value !== "pending" && value !== "listened") return;
              if (value === status.currentStatus) return;

              if (listened && value === "pending") {
                setConfirmationSubmitted(false);
                setConfirmPending(true);
                return;
              }

              setConfirmPending(false);
              status.onChange(value);
            }}
          >
            <SelectTrigger
              aria-labelledby={labelId}
              disabled={status.disabled}
              className={
                pending
                  ? "min-h-11 w-auto max-w-full gap-2 border-amber-500/25 bg-amber-500/5 px-3 text-xs text-amber-700 dark:text-amber-300"
                  : listened
                    ? "min-h-11 w-auto max-w-full gap-2 border-primary/25 bg-primary/5 px-3 text-xs text-primary"
                    : "min-h-11 w-auto max-w-full gap-2 border-border/60 bg-transparent px-3 text-xs"
              }
            >
              {status.saving ? (
                <RecordLoader size="sm" />
              ) : (
                <Icon aria-hidden="true" className="size-3.5" />
              )}

              <SelectValue>
                {status.saving
                  ? t("saving")
                  : pending
                    ? t("status.pending")
                    : listened
                      ? t("status.listened")
                      : t("status.add")}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="pending">
                <span className="inline-flex items-center gap-2">
                  <Clock aria-hidden="true" className="size-3.5" />
                  {t("status.pending")}
                </span>
              </SelectItem>

              <SelectItem value="listened">
                <span className="inline-flex items-center gap-2">
                  <Check aria-hidden="true" className="size-3.5" />
                  {t("status.listened")}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {listened && (
            <AlbumRating key={`${userId}:${albumId}`} albumId={albumId} />
          )}
        </div>

        {status.saveError && !dialogOpen && (
          <p
            role="alert"
            className="max-w-sm text-xs leading-5 text-destructive"
          >
            {t(status.errorKey)}
          </p>
        )}

        {status.remainingSeconds > 0 && !dialogOpen && (
          <p role="status" className="text-xs text-muted-foreground">
            {t("retryAfter", { count: status.remainingSeconds })}
          </p>
        )}

        <span role="status" className="sr-only">
          {status.saved && !status.saving ? t("saved") : ""}
        </span>
      </div>

      {listened && (
        <AlbumReview key={`${userId}:${albumId}`} albumId={albumId} />
      )}

      <AlbumConfirmation
        open={dialogOpen}
        saving={status.saving}
        disabled={status.disabled}
        errorKey={
          confirmationSubmitted && status.saveError ? status.errorKey : null
        }
        remainingSeconds={status.remainingSeconds}
        onOpenChange={(open) => {
          setConfirmPending(open);

          if (!open) setConfirmationSubmitted(false);
        }}
        onConfirm={() => {
          setConfirmationSubmitted(true);
          status.onChange("pending");
        }}
      />
    </div>
  );
}
