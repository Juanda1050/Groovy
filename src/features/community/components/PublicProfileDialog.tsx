import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { AlbumPostCard } from "@/features/community/components/AlbumPostCard";
import { useCommunityFeed } from "@/features/community/hooks/useCommunityFeed";

import {
  useCommunityActions,
  useCommunitySocial,
} from "@/features/community/hooks/useCommunitySocial";

import { usePublicProfile } from "@/features/community/hooks/usePublicProfile";
import { UserAvatar } from "@/features/profile/components/UserAvatar";

import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";

import type { PublicProfileDialogProps } from "@/models/library";

export function PublicProfileDialog({
  userId,
  open,
  onOpenChange,
}: PublicProfileDialogProps) {
  const { t, i18n } = useTranslation("community");

  const top = useRef<HTMLDivElement>(null);
  const profile = usePublicProfile(userId);

  const feed = useCommunityFeed(userId, open && profile.isSuccess);

  const social = useCommunitySocial(
    open ? feed.items.map((item) => item.id) : [],
  );

  const actions = useCommunityActions();
  const data = profile.data;
  const bio = data?.bio?.trim() ?? "";

  const formatter = new Intl.NumberFormat(i18n.resolvedLanguage ?? "en");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />

        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background text-foreground shadow-2xl outline-none sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]">
          <header className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 px-2 py-1.5 backdrop-blur-sm sm:px-4">
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 rounded-full"
                />
              }
              aria-label={t("profile.back")}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Dialog.Close>

            <Dialog.Title className="truncate text-sm font-semibold">
              {t("social.profileTitle")}
            </Dialog.Title>

            <Dialog.Description className="sr-only">
              {t("social.profileDescription")}
            </Dialog.Description>
          </header>

          <div ref={top} className="min-h-0 overflow-y-auto overscroll-contain">
            {profile.isPending ? (
              <div
                role="status"
                className="flex items-center justify-center gap-3 p-8 text-sm text-muted-foreground"
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
                  disabled={profile.isFetching}
                  onClick={() => {
                    void profile.refetch();
                  }}
                >
                  {t("actions.retry")}
                </Button>
              </div>
            ) : (
              <>
                <section className="px-4 pb-5 pt-6 sm:px-6">
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="wrap-break-word text-2xl font-bold leading-8 tracking-tight">
                        {data.display_name || data.username || t("post.author")}
                      </h2>

                      {data.username && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          @{data.username}
                        </p>
                      )}
                    </div>

                    <UserAvatar
                      size="lg"
                      name={
                        data.display_name || data.username || t("post.author")
                      }
                      src={data.avatar_url}
                    />
                  </div>

                  {bio && (
                    <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-6">
                      {bio}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span>
                      <strong className="font-semibold text-foreground">
                        {formatter.format(data.followers_count)}
                      </strong>{" "}
                      {t("social.followersCount")}
                    </span>

                    <span>
                      <strong className="font-semibold text-foreground">
                        {formatter.format(data.following_count)}
                      </strong>{" "}
                      {t("social.followingCount")}
                    </span>
                  </div>

                  {actions.userId !== data.id && (
                    <Button
                      type="button"
                      variant={data.following ? "outline" : "default"}
                      disabled={actions.disabled || profile.isFetching}
                      aria-label={t(
                        data.following ? "social.unfollow" : "social.follow",
                      )}
                      onClick={() =>
                        actions.onAction("follow", data.id, !data.following)
                      }
                      className="mt-4 w-full rounded-lg sm:w-auto sm:min-w-32"
                    >
                      {t(data.following ? "social.following" : "social.follow")}
                    </Button>
                  )}
                </section>

                <section aria-label={t("profile.posts")} className="pb-3">
                  <div className="border-b border-border/60 px-4 sm:px-6">
                    <h3 className="inline-flex border-b-2 border-primary px-1 pb-3 pt-2 text-sm font-semibold">
                      {t("profile.posts")}
                    </h3>
                  </div>

                  {social.error && (
                    <div
                      role="alert"
                      className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6"
                    >
                      <p className="text-xs text-destructive">
                        {t("social.readError")}
                      </p>

                      <Button
                        variant="ghost"
                        className="min-h-11 text-xs"
                        onClick={social.onRetry}
                      >
                        {t("actions.retry")}
                      </Button>
                    </div>
                  )}

                  {feed.pending ? (
                    <div
                      role="status"
                      className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground"
                    >
                      <RecordLoader size="sm" />
                      {t("loading")}
                    </div>
                  ) : (
                    <div
                      aria-busy={feed.fetching}
                      className="space-y-5 bg-muted/35 px-3 py-5 sm:px-5 sm:py-6"
                    >
                      {feed.items.map((item) => {
                        const state = social.byId.get(item.id) ?? null;

                        return (
                          <AlbumPostCard
                            key={item.id}
                            variant="profile"
                            item={item}
                            social={state}
                            viewerId={actions.userId}
                            busy={actions.disabled}
                            onProfile={() =>
                              top.current?.scrollTo({
                                top: 0,
                              })
                            }
                            onReaction={() =>
                              actions.onAction(
                                "reaction",
                                item.id,
                                !state?.reacted,
                              )
                            }
                            onFollow={() =>
                              actions.onAction(
                                "follow",
                                item.user_id,
                                !state?.following_author,
                              )
                            }
                            onSaveAlbum={() =>
                              actions.onAction("library", item.id, true)
                            }
                          />
                        );
                      })}

                      {!feed.error && !feed.items.length && (
                        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                          {t("profile.empty")}
                        </p>
                      )}
                    </div>
                  )}

                  {feed.error && (
                    <div role="alert" className="space-y-2 px-4 py-4 sm:px-6">
                      <p className="text-sm text-destructive">{t("error")}</p>

                      <Button
                        variant="outline"
                        disabled={feed.fetching}
                        onClick={
                          feed.nextError ? feed.onLoadMore : feed.onRetry
                        }
                      >
                        {t("actions.retry")}
                      </Button>
                    </div>
                  )}

                  {feed.hasMore && !feed.error && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        disabled={feed.fetching}
                        onClick={feed.onLoadMore}
                        className="min-h-11 rounded-full px-5 text-xs"
                      >
                        {feed.loadingMore && <RecordLoader size="sm" />}
                        {t("actions.more")}
                      </Button>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
