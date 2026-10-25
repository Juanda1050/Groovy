import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft,RefreshCw } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { AlbumPostCard } from "@/features/community/components/AlbumPostCard";
import { useCommunityFeed } from "@/features/community/hooks/useCommunityFeed";
import { useCommunityActions,useCommunitySocial } from "@/features/community/hooks/useCommunitySocial";
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

  const formatter = new Intl.NumberFormat(i18n.resolvedLanguage ?? "en");

  function refreshPosts(): void {
    feed.onRefresh();
    social.onRetry();
  }

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
            max-h-[calc(100svh-1rem)]
            w-[calc(100%-1rem)] max-w-2xl
            -translate-x-1/2 -translate-y-1/2
            overflow-y-auto overscroll-contain
            rounded-2xl border border-border/70
            bg-background text-foreground
            shadow-2xl outline-none
            sm:max-h-[calc(100svh-2rem)]
            sm:w-[calc(100%-2rem)]
          "
        >
          <div ref={top} />

          <header
            className="
              sticky top-0 z-10
              flex items-center gap-2
              border-b border-border/50
              bg-background/95
              px-2 py-1.5
              backdrop-blur-sm sm:px-4
            "
          >
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="
                    size-11 shrink-0
                    rounded-full
                  "
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

          {profile.isPending ? (
            <div
              role="status"
              className="
                flex items-center justify-center
                gap-3 p-8 text-sm
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
              <div
                className="
                  h-20 bg-linear-to-br
                  from-primary/25
                  via-primary/10 to-muted
                  sm:h-24
                "
              />

              <section className="px-4 pb-5 sm:px-6">
                <div
                  className="
                    -mt-8 flex items-end
                    justify-between gap-3
                  "
                >
                  <div
                    className="
                      relative rounded-full
                      bg-background p-1
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
                  <p
                    className="
                      mt-1 text-sm
                      text-muted-foreground
                    "
                  >
                    @{data.username}
                  </p>
                )}

                {data.bio && (
                  <p
                    className="
                      mt-3 whitespace-pre-wrap
                      wrap-break-word
                      text-sm leading-6
                    "
                  >
                    {data.bio}
                  </p>
                )}

                <div
                  className="
                    mt-4 flex flex-wrap
                    gap-x-5 gap-y-2
                    text-xs text-muted-foreground
                  "
                >
                  <span>
                    <strong
                      className="
                        font-semibold text-foreground
                      "
                    >
                      {formatter.format(data.following_count)}
                    </strong>{" "}
                    {t("social.followingCount")}
                  </span>

                  <span>
                    <strong
                      className="
                        font-semibold text-foreground
                      "
                    >
                      {formatter.format(data.followers_count)}
                    </strong>{" "}
                    {t("social.followersCount")}
                  </span>
                </div>
              </section>

              <section
                aria-label={t("profile.posts")}
                className="
                  border-t border-border/50
                  px-2 pb-4 sm:px-4
                "
              >
                <div
                  className="
                    flex items-center
                    justify-between gap-3 py-2
                  "
                >
                  <h3
                    className="
                      px-2 text-sm font-semibold
                    "
                  >
                    {t("profile.posts")}
                  </h3>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("actions.refresh")}
                    disabled={feed.fetching || feed.needsSignIn}
                    onClick={refreshPosts}
                    className="size-11 rounded-full"
                  >
                    <RefreshCw
                      aria-hidden="true"
                      className={`
                        size-4
                        ${feed.fetching ? "motion-safe:animate-spin" : ""}
                      `}
                    />
                  </Button>
                </div>

                {feed.updates && (
                  <Button
                    variant="ghost"
                    disabled={feed.fetching}
                    onClick={refreshPosts}
                    className="
                      mb-3 min-h-11
                      w-full text-primary
                    "
                  >
                    {t("actions.updates")}
                  </Button>
                )}

                {social.error && (
                  <div
                    role="alert"
                    className="
                      mb-3 flex flex-wrap
                      items-center gap-2 px-2
                    "
                  >
                    <p
                      className="
                        text-xs text-destructive
                      "
                    >
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
                    className="
                      flex items-center
                      justify-center gap-3
                      py-8 text-sm
                      text-muted-foreground
                    "
                  >
                    <RecordLoader size="sm" />
                    {t("loading")}
                  </div>
                ) : (
                  <div aria-busy={feed.fetching} className="space-y-3">
                    {feed.items.map((item) => {
                      const state = social.byId.get(item.id) ?? null;

                      return (
                        <AlbumPostCard
                          key={item.id}
                          item={item}
                          social={state}
                          viewerId={actions.userId}
                          busy={actions.disabled}
                          onProfile={() =>
                            top.current?.scrollIntoView({
                              block: "start",
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
                      <p
                        className="
                            px-2 py-8 text-center
                            text-sm
                            text-muted-foreground
                          "
                      >
                        {t("profile.empty")}
                      </p>
                    )}
                  </div>
                )}

                {feed.error && (
                  <div role="alert" className="space-y-2 px-2 py-4">
                    <p
                      className="
                        text-sm text-destructive
                      "
                    >
                      {t("error")}
                    </p>

                    <Button
                      variant="outline"
                      disabled={feed.fetching}
                      onClick={feed.nextError ? feed.onLoadMore : feed.onRetry}
                    >
                      {t("actions.retry")}
                    </Button>
                  </div>
                )}

                {feed.hasMore && !feed.error && (
                  <div
                    className="
                      flex justify-center pt-4
                    "
                  >
                    <Button
                      variant="outline"
                      disabled={feed.fetching}
                      onClick={feed.onLoadMore}
                      className="
                        min-h-11 rounded-full
                        px-5 text-xs
                      "
                    >
                      {feed.loadingMore && <RecordLoader size="sm" />}

                      {t(feed.loadingMore ? "loading" : "actions.more")}
                    </Button>
                  </div>
                )}
              </section>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
