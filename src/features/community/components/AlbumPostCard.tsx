import {
  BookmarkCheck,
  BookmarkPlus,
  Disc3,
  Headphones,
  Heart,
  MessageCircle,
} from "lucide-react";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumPostComments } from "@/features/community/components/AlbumPostComments";
import { AlbumPostReactionsDialog } from "@/features/community/components/AlbumPostReactionsDialog";
import { AlbumRatingBadge } from "@/features/library/components/AlbumRatingBadge";
import { UserAvatar } from "@/features/profile/components/UserAvatar";

import { Button } from "@/shared/components/ui/button";

import type { AlbumFeedCardProps } from "@/models/library";

const postActionHover =
  "hover:bg-transparent hover:text-primary active:bg-transparent";

export function AlbumPostCard({
  variant = "card",
  item,
  social,
  viewerId,
  busy,
  onProfile,
  onReaction,
  onFollow,
  onSaveAlbum,
}: AlbumFeedCardProps) {
  const { t, i18n } = useTranslation("community");

  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [failedCover, setFailedCover] = useState<string | null>(null);

  const commentsId = useId();

  const name =
    item.author?.display_name || item.author?.username || t("post.author");

  const cover = item.album?.coverUrl;
  const locale = i18n.resolvedLanguage ?? "en";
  const activityDate = new Date(item.updated_at);

  const shortDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(activityDate);

  const fullDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(activityDate);

  const count = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(social?.reaction_count ?? 0);

  const profileLayout = variant === "profile";
  const saved = Boolean(social?.library_status);

  const canFollow =
    !profileLayout && Boolean(viewerId && viewerId !== item.user_id);

  const review = item.review?.trim();

  const containerClassName = profileLayout
    ? "min-w-0 rounded-2xl border border-border/80 bg-card px-4 pb-3 pt-4 text-card-foreground shadow-[0_2px_8px_-2px_rgb(0_0_0/0.12),0_10px_24px_-18px_rgb(0_0_0/0.24)] sm:px-5 sm:pt-5"
    : "min-w-0 rounded-2xl border border-border/60 bg-card px-5 pb-3 pt-4 text-card-foreground shadow-sm shadow-black/2.5 sm:px-6 sm:pt-5";

  return (
    <article className={containerClassName}>
      {profileLayout ? (
        <header className="mb-3 flex min-w-0 items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Headphones
              aria-hidden="true"
              className="size-3.5 shrink-0 text-primary/70"
            />

            <span className="truncate">{t("post.listened")}</span>
          </span>

          <time
            dateTime={item.updated_at}
            title={fullDate}
            className="shrink-0 tabular-nums"
          >
            {shortDate}
          </time>
        </header>
      ) : (
        <header className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onProfile}
            aria-label={t("social.openProfile", { name })}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserAvatar name={name} src={item.author?.avatar_url ?? null} />
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onProfile}
              className="block max-w-full truncate rounded-sm text-left text-sm font-semibold leading-5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {name}
            </button>

            <div className="flex min-w-0 items-center gap-2 text-[11px] leading-4 text-muted-foreground">
              {item.author?.username && (
                <span className="max-w-28 truncate sm:max-w-48">
                  @{item.author.username}
                </span>
              )}

              <time
                dateTime={item.updated_at}
                title={fullDate}
                className="shrink-0"
              >
                {shortDate}
              </time>
            </div>
          </div>

          {canFollow && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy || !social}
              onClick={onFollow}
              aria-label={t(
                social?.following_author ? "social.unfollow" : "social.follow",
              )}
              title={t(
                social?.following_author ? "social.unfollow" : "social.follow",
              )}
              className={`
                -mr-2 min-h-11 shrink-0 rounded-lg px-2
                text-xs hover:bg-primary/5
                ${
                  social?.following_author
                    ? "text-muted-foreground"
                    : "text-primary"
                }
              `}
            >
              {t(
                social?.following_author ? "social.following" : "social.follow",
              )}
            </Button>
          )}
        </header>
      )}

      <Link
        to={`/albums/${item.spotify_album_id}`}
        state={{ returnTo: "/community" }}
        aria-label={t("post.openAlbum", {
          album: item.album?.name ?? t("post.album"),
        })}
        className={
          profileLayout
            ? "group flex min-w-0 items-start gap-3.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
            : "group mt-3 flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
        }
      >
        <div
          className={
            profileLayout
              ? "flex size-22 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-border/50 sm:size-24"
              : "flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:size-32"
          }
        >
          {cover && failedCover !== cover ? (
            <img
              src={cover}
              alt=""
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-opacity group-hover:opacity-90"
              onError={() => setFailedCover(cover)}
            />
          ) : (
            <Disc3
              aria-hidden="true"
              className="size-7 text-muted-foreground/50"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h2
            className={
              profileLayout
                ? "line-clamp-2 wrap-break-word text-base font-semibold leading-6 tracking-tight transition-colors group-hover:text-primary sm:text-lg"
                : "line-clamp-2 wrap-break-word text-[15px] font-semibold leading-5 transition-colors group-hover:text-primary sm:text-base"
            }
          >
            {item.album?.name ?? t("post.album")}
          </h2>

          {Boolean(item.album?.artists.length) && (
            <p className="truncate text-xs leading-5 text-muted-foreground">
              {item.album?.artists.join(", ")}
            </p>
          )}

          {item.rating !== null ? (
            <div className="pt-0.5">
              <AlbumRatingBadge rating={item.rating} />
            </div>
          ) : (
            !review &&
            !profileLayout && (
              <p className="text-xs leading-5 text-muted-foreground">
                {t("post.listened")}
              </p>
            )
          )}
        </div>
      </Link>

      {review && (
        <p
          className={
            profileLayout
              ? "mt-3.5 whitespace-pre-wrap wrap-break-word text-[15px] leading-7 text-foreground/90"
              : "mt-3 whitespace-pre-wrap wrap-break-word text-[15px] leading-6 text-foreground/90"
          }
        >
          {review}
        </p>
      )}

      <footer
        className={
          profileLayout
            ? "mt-2.5 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-0"
            : "mt-3 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-0 border-t border-border/45 pt-1.5"
        }
      >
        <div className="-ml-2 inline-flex items-center gap-0">
          <Button
            type="button"
            variant="ghost"
            aria-pressed={social?.reacted ?? false}
            aria-label={t(social?.reacted ? "social.unreact" : "social.react")}
            title={t(social?.reacted ? "social.unreact" : "social.react")}
            disabled={busy || !social}
            onClick={onReaction}
            className={`
              h-11 w-9 justify-end rounded-md p-0 pr-1
              text-muted-foreground aria-pressed:text-primary
              ${postActionHover}
            `}
          >
            <Heart
              aria-hidden="true"
              className={`size-4 ${social?.reacted ? "fill-current" : ""}`}
            />
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={!viewerId || !social}
            aria-label={t("reactions.open")}
            title={t("reactions.open")}
            aria-haspopup="dialog"
            onClick={() => setReactionsOpen(true)}
            className={`
              min-h-11 min-w-5 justify-start rounded-md
              p-0 pr-1 text-xs font-medium tabular-nums
              text-muted-foreground
              ${postActionHover}
            `}
          >
            {count}
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          aria-label={t(
            commentsOpen ? "comments.closeComposer" : "comments.openComposer",
          )}
          title={t(
            commentsOpen ? "comments.closeComposer" : "comments.openComposer",
          )}
          aria-expanded={commentsOpen}
          aria-controls={commentsId}
          onClick={() => {
            setCommentsOpen((current) => !current);
          }}
          className={`
            min-h-11 rounded-lg px-1 text-muted-foreground
            aria-expanded:text-primary
            ${postActionHover}
          `}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
        </Button>

        {saved ? (
          <span
            title={t("social.inLibrary")}
            className="inline-flex min-h-11 min-w-0 items-center gap-1.5 justify-self-end px-2 text-xs text-primary"
          >
            <BookmarkCheck aria-hidden="true" className="size-4 shrink-0" />

            <span className="truncate">{t("social.savedShort")}</span>
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={busy || !social}
            onClick={onSaveAlbum}
            aria-label={t("social.saveAlbum")}
            title={t("social.saveAlbum")}
            className="min-h-11 min-w-0 gap-1.5 justify-self-end rounded-lg px-2 text-xs text-muted-foreground hover:bg-primary/5 hover:text-primary"
          >
            <BookmarkPlus aria-hidden="true" className="size-4 shrink-0" />

            <span className="truncate">{t("social.saveShort")}</span>
          </Button>
        )}
      </footer>

      {reactionsOpen && (
        <AlbumPostReactionsDialog
          postId={item.id}
          count={social?.reaction_count ?? 0}
          open={reactionsOpen}
          onOpenChange={setReactionsOpen}
        />
      )}

      <div id={commentsId}>
        <AlbumPostComments postId={item.id} open={commentsOpen} />
      </div>
    </article>
  );
}
