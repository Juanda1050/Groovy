import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAlbumPostReactions } from "@/features/community/hooks/useAlbumPostReactions";
import { UserAvatar } from "@/features/profile/components/UserAvatar";

import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";

export function AlbumPostReactionsDialog({
  postId,
  count,
  open,
  onOpenChange,
}: {
  postId: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("community");

  const reactions = useAlbumPostReactions(postId, open, count);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />

        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[80dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl outline-none">
          <header className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-base font-semibold">
              {t("reactions.title")}
            </Dialog.Title>

            <div className="flex items-center">
              <Dialog.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("social.close")}
                  />
                }
              >
                <X aria-hidden="true" className="size-4" />
              </Dialog.Close>
            </div>
          </header>

          <Dialog.Description className="mb-2 text-xs text-muted-foreground">
            {t("reactions.description")}
          </Dialog.Description>

          <div
            className="min-h-0 overflow-y-auto overscroll-contain"
            aria-busy={reactions.isFetching}
          >
            {reactions.isPending ? (
              <p
                role="status"
                className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
              >
                <RecordLoader size="sm" />
                {t("reactions.loading")}
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {reactions.items.map((person) => (
                  <li
                    key={person.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <UserAvatar
                      name={
                        person.display_name ||
                        person.username ||
                        t("post.author")
                      }
                      src={person.avatar_url}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {person.display_name ||
                          person.username ||
                          t("post.author")}
                      </p>

                      {person.username && (
                        <p className="truncate text-xs text-muted-foreground">
                          @{person.username}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!reactions.isPending &&
              !reactions.isError &&
              !reactions.items.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("reactions.empty")}
                </p>
              )}

            {reactions.isError && (
              <div role="alert" className="space-y-2 py-3">
                <p className="text-xs text-destructive">
                  {t("reactions.error")}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={reactions.isFetching}
                  onClick={() => {
                    if (reactions.isFetchNextPageError) {
                      void reactions.fetchNextPage();
                    } else {
                      void reactions.refetch();
                    }
                  }}
                >
                  {t("actions.retry")}
                </Button>
              </div>
            )}

            {reactions.hasNextPage && !reactions.isError && (
              <Button
                variant="ghost"
                disabled={reactions.isFetching}
                className="mt-2 min-h-11 w-full text-xs"
                onClick={() => void reactions.fetchNextPage()}
              >
                {reactions.isFetchingNextPage && <RecordLoader size="sm" />}

                {t("reactions.more")}
              </Button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
