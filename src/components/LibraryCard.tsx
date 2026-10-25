import { MessageSquare, Music2, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LibraryCardProps } from "@/models/libraryView";

export function LibraryCard({ item, ratingLabel, labels }: LibraryCardProps) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt=""
            width={320}
            height={320}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Music2
              aria-hidden="true"
              className="size-10 text-muted-foreground/50"
            />
          </div>
        )}

        {ratingLabel && (
          <span
            aria-label={`${labels.rating}: ${ratingLabel}`}
            className="
              absolute bottom-2 right-2 inline-flex
              items-center gap-1 rounded-lg
              bg-[#071426]/90 px-2 py-1
              text-xs font-semibold text-[#f0f7ff]
            "
          >
            <Star aria-hidden="true" className="size-3 text-[#57b6ff]" />
            {ratingLabel}
          </span>
        )}
      </div>

      <CardContent className="space-y-2 p-3 sm:p-4">
        <div>
          <h2 className="truncate text-sm font-semibold">
            {item.title ?? labels.unavailable}
          </h2>

          {item.artists.length > 0 && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item.artists.join(", ")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {item.status === "pending" ? labels.pending : labels.listened}
          </span>

          {item.hasReview && (
            <span aria-label={labels.review} title={labels.review}>
              <MessageSquare
                aria-hidden="true"
                className="size-3.5 text-primary"
              />
            </span>
          )}
        </div>

        {!item.metadataAvailable && (
          <p className="text-xs leading-5 text-muted-foreground">
            {labels.metadataPending}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
