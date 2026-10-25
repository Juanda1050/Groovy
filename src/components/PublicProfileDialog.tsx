import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RecordLoader } from "@/components/RecordLoader";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useCommunityActions, usePublicProfile } from "@/hooks/useProfile";

import type { PublicProfileDialogProps } from "@/models/library";

export function PublicProfileDialog({
  userId,
  open,
  onOpenChange,
}: PublicProfileDialogProps) {
  const { t, i18n } = useTranslation("community");

  const profile = usePublicProfile(userId);

  const actions = useCommunityActions();

  const data = profile.data;

  const formatter = new Intl.NumberFormat(i18n.resolvedLanguage ?? "en");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="
            fixed inset-0 z-50
            bg-black/55 backdrop-blur-sm
          "
        />

        <Dialog.Popup
          className="
            fixed left-1/2 top-1/2 z-50
            max-h-[calc(100svh-2rem)]
            w-[calc(100%-2rem)] max-w-md
            -translate-x-1/2 -translate-y-1/2
            overflow-y-auto rounded-2xl
            border border-border/70
            bg-card text-card-foreground
            shadow-2xl outline-none
          "
        >
          <div
            className="
              relative h-24
              bg-linear-to-br
              from-primary/25
              via-primary/10 to-muted
            "
          >
            <Dialog.Title className="sr-only">
              {t("social.profileTitle")}
            </Dialog.Title>

            <Dialog.Description className="sr-only">
              {t("social.profileDescription")}
            </Dialog.Description>

            <Dialog.Close
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="
                    absolute right-3 top-3
                    size-11 rounded-full
                    bg-background/90
                  "
                />
              }
              aria-label={t("social.close")}
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>

          {profile.isPending ? (
            <div
              role="status"
              className="
                flex items-center
                justify-center gap-3
                p-8 text-sm
                text-muted-foreground
              "
            >
              <RecordLoader size="sm" />
              {t("social.profileLoading")}
            </div>
          ) : profile.isError || !data ? (
            <div role="alert" className="space-y-3 p-6">
              <p className="text-sm text-destructive">
                {t("social.profileError")}
              </p>

              <Button
                variant="outline"
                onClick={() => {
                  void profile.refetch();
                }}
                disabled={profile.isFetching}
              >
                {t("actions.retry")}
              </Button>
            </div>
          ) : (
            <div className="px-5 pb-6 sm:px-6">
              <div
                className="
                  -mt-8 flex items-end
                  justify-between gap-3
                "
              >
                <div
                  className="
                    relative rounded-full
                    bg-card p-1
                  "
                >
                  <UserAvatar
                    size="lg"
                    name={
                      data.display_name || data.username || t("post.author")
                    }
                    src={data.avatar_url}
                  />
                </div>

                {actions.userId !== data.id && (
                  <Button
                    type="button"
                    variant={data.following ? "outline" : "default"}
                    disabled={actions.disabled || profile.isFetching}
                    aria-label={t(
                      data.following ? "social.unfollow" : "social.follow",
                    )}
                    title={t(
                      data.following ? "social.unfollow" : "social.follow",
                    )}
                    onClick={() =>
                      actions.onAction("follow", data.id, !data.following)
                    }
                    className="
                      min-h-11 rounded-full
                      px-4 text-xs
                    "
                  >
                    {t(data.following ? "social.following" : "social.follow")}
                  </Button>
                )}
              </div>

              <h2
                className="
                  mt-3 wrap-break-word
                  text-xl font-semibold
                  tracking-tight
                "
              >
                {data.display_name || data.username || t("post.author")}
              </h2>

              {data.username && (
                <p className="mt-1 text-sm text-muted-foreground">
                  @{data.username}
                </p>
              )}

              {data.bio && (
                <p
                  className="
                    mt-4 whitespace-pre-wrap
                    wrap-break-word text-sm
                    leading-6
                  "
                >
                  {data.bio}
                </p>
              )}

              <div
                className="
                  mt-5 flex flex-wrap
                  gap-x-5 gap-y-2
                  text-xs
                  text-muted-foreground
                "
              >
                <span>
                  <strong className="font-semibold text-foreground">
                    {formatter.format(data.following_count)}
                  </strong>{" "}
                  {t("social.followingCount")}
                </span>

                <span>
                  <strong className="font-semibold text-foreground">
                    {formatter.format(data.followers_count)}
                  </strong>{" "}
                  {t("social.followersCount")}
                </span>
              </div>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
