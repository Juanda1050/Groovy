import { useId, useState } from "react";
import { BookmarkPlus, Check, Clock, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { AlbumConfirmation } from "@/components/AlbumConfirmation";
import { AlbumRating } from "@/components/AlbumRating";
import { AlbumReview } from "@/components/AlbumReview";
import { RecordLoader } from "@/components/RecordLoader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAlbumRemoval, useAlbumStatus } from "@/hooks/useAlbumStatus";
import { useAuthStore } from "@/stores/authStore";

import type { AlbumStatusProps } from "@/models/albumDetail";

export function AlbumStatus({ albumId }: AlbumStatusProps) {
  const { t } = useTranslation("rating");
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const status = useAlbumStatus(albumId);
  const removal = useAlbumRemoval(albumId);
  const labelId = useId();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmationSubmitted, setConfirmationSubmitted] = useState(false);

  const pending = status.currentStatus === "pending";
  const listened = status.currentStatus === "listened";
  const dialogOpen = confirmPending && listened;

  async function onConfirmRemoval() {
    const removed = await removal.onRemove();

    if (!removed) return;

    setConfirmDelete(false);
    navigate("/library", { replace: true });
  }

  if (status.loading) {
    return (
      <div
        role="status"
        className="
          flex min-h-11 items-center gap-2
          text-xs text-muted-foreground
        "
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
              if (value !== "pending" && value !== "listened") {
                return;
              }

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

          {status.currentStatus !== null && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removal.open")}
              title={t("removal.open")}
              disabled={removal.disabled}
              className="
                ml-auto size-11 shrink-0 rounded-xl
                text-muted-foreground
                hover:bg-destructive/10
                hover:text-destructive
              "
              onClick={() => {
                removal.onReset();
                setConfirmPending(false);
                setConfirmDelete(true);
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
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
            {t("retryAfter", {
              count: status.remainingSeconds,
            })}
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
        mode="delete"
        open={confirmDelete}
        saving={removal.saving}
        disabled={removal.disabled}
        errorKey={removal.errorKey}
        remainingSeconds={removal.remainingSeconds}
        onOpenChange={(open) => {
          if (removal.saving) return;

          setConfirmDelete(open);

          if (!open) {
            removal.onReset();
          }
        }}
        onConfirm={() => {
          void onConfirmRemoval();
        }}
      />

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

          if (!open) {
            setConfirmationSubmitted(false);
          }
        }}
        onConfirm={() => {
          setConfirmationSubmitted(true);
          status.onChange("pending");
        }}
      />
    </div>
  );
}
