import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlbumPostComments } from "@/features/community/hooks/useAlbumPostComments";
import { UserAvatar } from "@/features/profile/components/UserAvatar";

import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import type { AlbumPostCommentsProps } from "@/models/library";

import { CommentActionsMenu } from "./CommentActionsMenu";

export function AlbumPostComments({ postId, open }: AlbumPostCommentsProps) {
  const { t, i18n } = useTranslation("community");
  const section = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const comments = useAlbumPostComments(postId, open || visible);

  useEffect(() => {
    const element = section.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(Boolean(entry?.isIntersecting));
      },
      {
        rootMargin: "160px",
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [postId]);

  const expanded = open || comments.editingId !== null;
  const items = expanded ? comments.items : comments.items.slice(0, 2);

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const inputId = useId();
  const hintId = useId();
  const editId = useId();
  const editHintId = useId();

  const tooLong = comments.length > comments.maxLength;

  const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const showSection =
    open ||
    comments.items.length > 0 ||
    comments.updates ||
    comments.editingId !== null ||
    confirmId !== null;

  if (!showSection) {
    return <div ref={section} className="h-px" aria-hidden="true" />;
  }

  return (
    <div ref={section}>
      <section
        aria-label={t("comments.title")}
        className="mt-3 border-t border-border/45 pt-4"
      >
        {items.length > 0 && (
          <header className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("comments.title")}</h3>
          </header>
        )}

        {comments.offline && (
          <p role="status" className="mb-3 text-xs text-muted-foreground">
            {t("comments.offline")}
          </p>
        )}

        {open && comments.userId && comments.editingId === null ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              comments.onSubmit();
            }}
            className="mb-5 space-y-2"
          >
            <label htmlFor={inputId} className="sr-only">
              {t("comments.label")}
            </label>

            <Textarea
              id={inputId}
              value={comments.value}
              onChange={(event) => comments.onChange(event.target.value)}
              placeholder={t("comments.placeholder")}
              rows={1}
              maxLength={comments.maxLength * 2}
              disabled={comments.busy}
              aria-invalid={tooLong}
              aria-describedby={hintId}
              className="min-h-11 max-h-28 field-sizing-content resize-none overflow-y-auto rounded-xl bg-background/40 py-2.25 text-left text-base leading-6 sm:text-sm"
            />

            <div className="flex items-center justify-between gap-3">
              <span
                id={hintId}
                className={`text-xs tabular-nums ${
                  tooLong ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {t("comments.length", {
                  count: comments.length,
                  max: comments.maxLength,
                })}
              </span>

              <Button
                type="submit"
                disabled={!comments.canSubmit}
                size="sm"
                className="min-h-11 rounded-full text-xs"
              >
                {comments.busy && <RecordLoader size="sm" />}
                {t("comments.publish")}
              </Button>
            </div>

            {tooLong && (
              <p role="status" className="text-xs text-destructive">
                {t("comments.tooLong", {
                  max: comments.maxLength,
                })}
              </p>
            )}

            {comments.remaining > 0 && (
              <p role="status" className="text-xs text-muted-foreground">
                {t("comments.remaining", {
                  count: comments.remaining,
                })}
              </p>
            )}
          </form>
        ) : (
          open &&
          !comments.userId && (
            <p className="py-3 text-sm text-muted-foreground">
              {t("signInRequired")}
            </p>
          )
        )}

        {comments.updates && (
          <Button
            variant="ghost"
            disabled={comments.fetching || comments.editingId !== null}
            onClick={comments.onRefresh}
            className="mb-3 min-h-11 w-full text-xs text-primary"
          >
            {t("comments.updates")}
          </Button>
        )}

        {comments.pending ? (
          <div
            role="status"
            className="flex items-center justify-center gap-3 py-6 text-sm text-muted-foreground"
          >
            <RecordLoader size="sm" />
            {t("comments.loading")}
          </div>
        ) : (
          <ul
            aria-busy={comments.fetching}
            className="divide-y divide-border/35"
          >
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-4">
                <UserAvatar
                  name={item.display_name || item.username || t("post.author")}
                  src={item.avatar_url}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="max-w-full truncate text-xs font-semibold">
                      {item.display_name || item.username || t("post.author")}
                    </span>

                    {item.username && (
                      <span className="max-w-32 truncate text-[11px] text-muted-foreground">
                        @{item.username}
                      </span>
                    )}

                    <time
                      dateTime={item.created_at}
                      className="text-[10px] text-muted-foreground"
                    >
                      {formatter.format(new Date(item.created_at))}
                    </time>

                    {item.edited_at && (
                      <span
                        title={formatter.format(new Date(item.edited_at))}
                        className="text-[10px] text-muted-foreground"
                      >
                        {t("comments.edited")}
                      </span>
                    )}
                  </div>

                  {comments.editingId === item.id ? (
                    <form
                      className="mt-2 space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        comments.onSaveEdit();
                      }}
                    >
                      <label htmlFor={editId} className="sr-only">
                        {t("comments.editLabel")}
                      </label>

                      <Textarea
                        id={editId}
                        autoFocus
                        value={comments.editValue}
                        onChange={(event) =>
                          comments.onEditChange(event.target.value)
                        }
                        rows={1}
                        maxLength={comments.maxLength * 2}
                        disabled={comments.busy}
                        aria-invalid={comments.editLength > comments.maxLength}
                        aria-describedby={editHintId}
                        className="min-h-11 max-h-28 field-sizing-content resize-none overflow-y-auto rounded-xl bg-background/40 py-2.25 text-left text-base leading-6 sm:text-sm"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          id={editHintId}
                          className={`text-xs tabular-nums ${
                            comments.editLength > comments.maxLength
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t("comments.length", {
                            count: comments.editLength,
                            max: comments.maxLength,
                          })}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={comments.busy}
                            onClick={comments.onCancelEdit}
                            size="sm"
                            className="rounded-full text-xs"
                          >
                            {t("comments.cancel")}
                          </Button>

                          <Button
                            type="submit"
                            disabled={!comments.canSaveEdit}
                            size="sm"
                            className="rounded-full text-xs"
                          >
                            {comments.busy && <RecordLoader size="sm" />}
                            {t("comments.saveEdit")}
                          </Button>
                        </div>
                      </div>

                      {comments.editLength > comments.maxLength && (
                        <p role="status" className="text-xs text-destructive">
                          {t("comments.tooLong", {
                            max: comments.maxLength,
                          })}
                        </p>
                      )}

                      {comments.editConflict && (
                        <div
                          role="alert"
                          className="space-y-2 rounded-xl border border-border bg-muted/30 p-3"
                        >
                          <p className="text-xs leading-5 text-muted-foreground">
                            {t("comments.editConflict")}
                          </p>

                          <p className="text-xs font-medium">
                            {t("comments.currentVersion")}
                          </p>

                          <blockquote className="wrap-break-word text-sm leading-6">
                            {comments.currentEditBody}
                          </blockquote>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={comments.busy || comments.fetching}
                            onClick={comments.onRebaseEdit}
                            size="sm"
                            className="text-xs"
                          >
                            {t("comments.keepChanges")}
                          </Button>
                        </div>
                      )}

                      {comments.remaining > 0 && (
                        <p
                          role="status"
                          className="text-xs text-muted-foreground"
                        >
                          {t("comments.remaining", {
                            count: comments.remaining,
                          })}
                        </p>
                      )}
                    </form>
                  ) : (
                    <p className="mt-1.5 wrap-break-word text-sm leading-6">
                      {item.body}
                    </p>
                  )}
                </div>

                {item.user_id === comments.userId &&
                  comments.editingId !== item.id && (
                    <CommentActionsMenu
                      disabled={comments.busy || comments.editingId !== null}
                      onEdit={() => comments.onStartEdit(item.id)}
                      onDelete={() => setConfirmId(item.id)}
                    />
                  )}
              </li>
            ))}
          </ul>
        )}

        {comments.error && (
          <div role="alert" className="space-y-2 py-3">
            <p className="text-xs text-destructive">{t("comments.error")}</p>

            <Button
              variant="outline"
              disabled={comments.fetching}
              onClick={comments.nextError ? comments.onMore : comments.onRetry}
              size="sm"
            >
              {t("actions.retry")}
            </Button>
          </div>
        )}

        {expanded && comments.hasMore && !comments.error && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              disabled={comments.fetching || comments.editingId !== null}
              onClick={comments.onMore}
              className="min-h-11 rounded-full text-xs"
            >
              {comments.loadingMore && <RecordLoader size="sm" />}
              {t("comments.more")}
            </Button>
          </div>
        )}

        <Dialog.Root
          open={confirmId !== null}
          onOpenChange={(next) => {
            if (!next && !comments.busy) {
              setConfirmId(null);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />

            <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none">
              <Dialog.Title className="text-base font-semibold">
                {t("comments.deleteTitle")}
              </Dialog.Title>

              <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("comments.deleteDescription")}
              </Dialog.Description>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Dialog.Close
                  render={<Button variant="outline" disabled={comments.busy} />}
                >
                  {t("comments.cancel")}
                </Dialog.Close>

                <Button
                  variant="destructive"
                  disabled={comments.busy}
                  onClick={async () => {
                    if (confirmId && (await comments.onDelete(confirmId))) {
                      setConfirmId(null);
                    }
                  }}
                >
                  {comments.busy && <RecordLoader size="sm" />}
                  {t("comments.confirmDelete")}
                </Button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </section>
    </div>
  );
}
