import { useId, useState } from "react";
import {
  BookmarkCheck,
  BookmarkPlus,
  Disc3,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumPostComments } from "@/components/AlbumPostComments";
import { AlbumRatingBadge } from "@/components/AlbumRatingBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";

import type { AlbumFeedCardProps } from "@/models/library";

export function AlbumPostCard({
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMounted, setCommentsMounted] = useState(false);
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

  const saved = Boolean(social?.library_status);
  const canFollow = Boolean(viewerId && viewerId !== item.user_id);
  const review = item.review?.trim();

  return (
    <article
      className="
        min-w-0 rounded-2xl border border-border/60
        bg-card px-5 pb-3 pt-4 text-card-foreground
        shadow-sm shadow-black/2.5 sm:px-6 sm:pt-5
      "
    >
      <header className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onProfile}
          aria-label={t("social.openProfile", { name })}
          className="
            shrink-0 rounded-full focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-ring
          "
        >
          <UserAvatar name={name} src={item.author?.avatar_url ?? null} />
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onProfile}
            className="
              block max-w-full truncate rounded-sm text-left
              text-sm font-semibold leading-5 hover:underline
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring
            "
          >
            {name}
          </button>

          <div
            className="
              flex min-w-0 items-center gap-2
              text-[11px] leading-4 text-muted-foreground
            "
          >
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
            {t(social?.following_author ? "social.following" : "social.follow")}
          </Button>
        )}
      </header>

      <Link
        to={`/albums/${item.spotify_album_id}`}
        state={{ returnTo: "/community" }}
        aria-label={t("post.openAlbum", {
          album: item.album?.name ?? t("post.album"),
        })}
        className="
          group mt-3 flex min-w-0 items-center gap-3 rounded-lg
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-ring sm:gap-4
        "
      >
        <div
          className="
            flex size-24 shrink-0 items-center justify-center
            overflow-hidden rounded-lg bg-muted sm:size-32
          "
        >
          {cover && failedCover !== cover ? (
            <img
              src={cover}
              alt=""
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
              className="
                size-full object-cover transition-opacity
                group-hover:opacity-90
              "
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
            className="
              line-clamp-2 wrap-break-word text-[15px]
              font-semibold leading-5 transition-colors
              group-hover:text-primary sm:text-base
            "
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
            !review && (
              <p className="text-xs leading-5 text-muted-foreground">
                {t("post.listened")}
              </p>
            )
          )}
        </div>
      </Link>

      {review && (
        <p
          className="
            mt-3 whitespace-pre-wrap wrap-break-word
            text-[15px] leading-6 text-foreground/90
          "
        >
          {review}
        </p>
      )}

      <footer
        className="
          mt-3 grid grid-cols-[auto_auto_minmax(0,1fr)]
          items-center gap-1 border-t border-border/45 pt-1.5
        "
      >
        <Button
          type="button"
          variant="ghost"
          aria-pressed={social?.reacted ?? false}
          aria-label={t(social?.reacted ? "social.unreact" : "social.react")}
          disabled={busy || !social}
          onClick={onReaction}
          className="
            -ml-2 min-h-11 gap-1.5 rounded-lg px-2
            text-muted-foreground hover:bg-primary/5
            hover:text-primary aria-pressed:text-primary
          "
        >
          <Heart
            aria-hidden="true"
            className={`size-4 ${social?.reacted ? "fill-current" : ""}`}
          />
          {social && <span className="text-xs tabular-nums">{count}</span>}
        </Button>

        <Button
          type="button"
          variant="ghost"
          aria-label={t("comments.title")}
          title={t("comments.title")}
          aria-expanded={commentsOpen}
          aria-controls={commentsMounted ? commentsId : undefined}
          onClick={() => {
            setCommentsMounted(true);
            setCommentsOpen((current) => !current);
          }}
          className="
            min-h-11 rounded-lg px-2 text-muted-foreground
            hover:bg-primary/5 hover:text-primary
            aria-expanded:text-primary
          "
        >
          <MessageCircle aria-hidden="true" className="size-4" />
        </Button>

        {saved ? (
          <span
            title={t("social.inLibrary")}
            className="
              inline-flex min-h-11 min-w-0 items-center gap-1.5
              justify-self-end px-2 text-xs text-primary
            "
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
            className="
              min-h-11 min-w-0 gap-1.5 justify-self-end
              rounded-lg px-2 text-xs text-muted-foreground
              hover:bg-primary/5 hover:text-primary
            "
          >
            <BookmarkPlus aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{t("social.saveShort")}</span>
          </Button>
        )}
      </footer>

      {commentsMounted && (
        <div id={commentsId}>
          <AlbumPostComments postId={item.id} open={commentsOpen} />
        </div>
      )}
    </article>
  );
}
