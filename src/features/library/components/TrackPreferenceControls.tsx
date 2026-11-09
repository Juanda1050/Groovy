import { Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  MusicPreference,
  MusicPreferenceAction,
} from "@/models/musicPreferences";
import { Button } from "@/shared/components/ui/button";

interface TrackPreferenceControlsProps {
  name: string;
  preference: MusicPreference | null | undefined;
  disabled: boolean;
  onChange: (action: MusicPreferenceAction, active: boolean) => void;
}

export function TrackPreferenceControls({
  name,
  preference,
  disabled,
  onChange,
}: TrackPreferenceControlsProps) {
  const { t } = useTranslation("library");

  const favorite = preference?.is_favorite ?? false;
  const liked = preference?.sentiment === "like";
  const disliked = preference?.sentiment === "dislike";

  const favoriteLabel = t(
    favorite ? "tracks.removeFavorite" : "tracks.addFavorite",
    { name },
  );

  const likeLabel = t(
    favorite
      ? "tracks.favoriteIncludesLike"
      : liked
        ? "tracks.removeLike"
        : "tracks.addLike",
    { name },
  );

  const dislikeLabel = t(
    disliked ? "tracks.removeDislike" : "tracks.addDislike",
    { name },
  );

  return (
    <div
      role="group"
      aria-label={t("tracks.controls", { name })}
      className="inline-flex shrink-0 items-center gap-1"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={favoriteLabel}
        title={favoriteLabel}
        aria-pressed={favorite}
        onClick={() => onChange("favorite", !favorite)}
        className="size-11 rounded-full text-muted-foreground hover:text-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
      >
        <Star
          aria-hidden="true"
          className={favorite ? "size-4 fill-current" : "size-4"}
        />
      </Button>

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border/60" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || favorite}
        aria-label={likeLabel}
        title={likeLabel}
        aria-pressed={liked}
        onClick={() => onChange("like", !liked)}
        className="size-11 rounded-full text-muted-foreground hover:text-like aria-pressed:bg-like/10 aria-pressed:text-like disabled:aria-pressed:opacity-100"
      >
        <ThumbsUp
          aria-hidden="true"
          className={liked ? "size-4 fill-current" : "size-4"}
        />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={dislikeLabel}
        title={dislikeLabel}
        aria-pressed={disliked}
        onClick={() => onChange("dislike", !disliked)}
        className="size-11 rounded-full text-muted-foreground hover:text-dislike aria-pressed:bg-dislike/10 aria-pressed:text-dislike"
      >
        <ThumbsDown
          aria-hidden="true"
          className={disliked ? "size-4 fill-current" : "size-4"}
        />
      </Button>
    </div>
  );
}
