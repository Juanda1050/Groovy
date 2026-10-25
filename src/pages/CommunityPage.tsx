import { useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumPostCard } from "@/components/AlbumPostCard";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";
import { RecordLoader } from "@/components/RecordLoader";
import { Button } from "@/components/ui/button";
import { useCommunityFeed } from "@/hooks/useLibrary";
import { useCommunityActions, useCommunitySocial } from "@/hooks/useProfile";

import type { AlbumFeedCardProps, AlbumFeedItem } from "@/models/library";

export default function CommunityPage() {
  const { t } = useTranslation("community");

  const feed = useCommunityFeed();

  const social = useCommunitySocial(feed.items.map((item) => item.id));

  const actions = useCommunityActions();

  const [profileId, setProfileId] = useState<string | null>(null);

  function cardProps(item: AlbumFeedItem): AlbumFeedCardProps {
    const state = social.byId.get(item.id) ?? null;

    return {
      item,
      social: state,
      viewerId: actions.userId,
      busy: actions.disabled,

      onProfile: () => setProfileId(item.user_id),

      onReaction: () => actions.onAction("reaction", item.id, !state?.reacted),

      onFollow: () =>
        actions.onAction("follow", item.user_id, !state?.following_author),

      onSaveAlbum: () => actions.onAction("library", item.id, true),
    };
  }

  function onRefresh(): void {
    feed.onRefresh();
    social.onRetry();
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-2xl pb-8">
      <header
        className="
          flex items-center
          justify-between gap-3
          border-b border-border/40
          pb-3
        "
      >
        <h1 className="min-w-0 text-xl font-semibold tracking-tight">
          {t("navigation.community", {
            ns: "common",
          })}
        </h1>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("actions.refresh")}
          disabled={feed.fetching || feed.needsSignIn}
          onClick={onRefresh}
          className="size-11 shrink-0 rounded-full"
        >
          <RefreshCw
            aria-hidden="true"
            className={`
              size-4
              ${feed.fetching ? "motion-safe:animate-spin" : ""}
            `}
          />
        </Button>
      </header>

      {!feed.needsSignIn && feed.connection === "offline" && (
        <p
          role="status"
          className="
              flex items-center gap-2
              py-3 text-xs
              text-muted-foreground
            "
        >
          <WifiOff aria-hidden="true" className="size-3.5" />

          {t("connection.offline")}
        </p>
      )}

      {feed.updates && (
        <Button
          type="button"
          variant="ghost"
          disabled={feed.fetching}
          onClick={onRefresh}
          className="
            min-h-11 w-full
            rounded-none
            border-b border-border/40
            bg-transparent text-primary
            shadow-none hover:bg-primary/5
          "
        >
          {t("actions.updates")}
        </Button>
      )}

      {social.error && (
        <div
          role="alert"
          className="
            flex flex-wrap items-center
            gap-2 py-3
          "
        >
          <p className="text-xs text-destructive">{t("social.readError")}</p>

          <Button
            variant="ghost"
            onClick={social.onRetry}
            className="min-h-11 text-xs"
          >
            {t("actions.retry")}
          </Button>
        </div>
      )}

      {feed.needsSignIn ? (
        <p className="py-8 text-sm text-muted-foreground">
          {t("signInRequired")}
        </p>
      ) : feed.pending ? (
        <div
          role="status"
          className="
            flex items-center
            justify-center gap-3
            py-12 text-sm
            text-muted-foreground
          "
        >
          <RecordLoader size="sm" />
          {t("loading")}
        </div>
      ) : feed.error && !feed.items.length ? (
        <div role="alert" className="space-y-3 py-8">
          <p className="text-sm text-destructive">{t("error")}</p>

          <Button
            type="button"
            variant="outline"
            onClick={feed.onRetry}
            disabled={feed.fetching}
          >
            {t("actions.retry")}
          </Button>
        </div>
      ) : (
        <>
          {!feed.items.length ? (
            <div className="py-12 text-center">
              <h2 className="text-base font-medium">{t("empty.title")}</h2>

              <p
                className="
                  mx-auto mt-2 max-w-sm
                  text-sm leading-6
                  text-muted-foreground
                "
              >
                {t("empty.description")}
              </p>

              <Button
                variant="outline"
                className="mt-5 min-h-11 rounded-full"
                render={<Link to="/library" />}
              >
                {t("actions.library")}
              </Button>
            </div>
          ) : (
            <div aria-busy={feed.fetching} className="space-y-3 pt-4">
              {feed.items.map((item) => (
                <AlbumPostCard key={item.id} {...cardProps(item)} />
              ))}
            </div>
          )}

          {feed.error && (
            <p role="alert" className="text-sm text-destructive">
              {t("error")}
            </p>
          )}

          {(feed.hasMore || feed.nextError) && (
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={feed.fetching}
                onClick={feed.onLoadMore}
                className="
                  min-h-11 rounded-full
                  px-5 text-xs
                "
              >
                {feed.loadingMore && <RecordLoader size="sm" />}

                {t(
                  feed.loadingMore
                    ? "loading"
                    : feed.nextError
                      ? "actions.retry"
                      : "actions.more",
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {profileId && (
        <PublicProfileDialog
          userId={profileId}
          open
          onOpenChange={(open) => {
            if (!open) {
              setProfileId(null);
            }
          }}
        />
      )}
    </section>
  );
}
