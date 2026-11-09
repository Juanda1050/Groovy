import { Music2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { TrackPreferenceControls } from "@/features/library/components/TrackPreferenceControls";
import type {
  MusicPreference,
  MusicPreferenceAction,
} from "@/models/musicPreferences";
import type { SongLibraryItem } from "@/models/songLibrary";

interface SongRowProps {
  item: SongLibraryItem;
  preference: MusicPreference;
  disabled: boolean;
  onChange: (
    id: string,
    action: MusicPreferenceAction,
    active: boolean,
  ) => void;
}

export function SongRow({
  item,
  preference,
  disabled,
  onChange,
}: SongRowProps) {
  const { t } = useTranslation("library");
  const [failedCover, setFailedCover] = useState<string | null>(null);

  const metadata = item.metadata;
  const name = metadata?.name || t("tracks.unavailable");
  const cover = metadata?.coverUrl ?? null;
  const albumId = metadata?.albumId ?? item.albumId;
  const seconds = Math.floor((metadata?.durationMs ?? 0) / 1000);
  const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const artwork = (
    <>
      {cover && failedCover !== cover ? (
        <img
          src={cover}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          onError={() => setFailedCover(cover)}
          className="size-full object-cover"
        />
      ) : (
        <Music2 aria-hidden="true" className="size-5 text-muted-foreground" />
      )}
    </>
  );

  return (
    <li className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-4">
      {albumId ? (
        <Link
          to={`/albums/${albumId}`}
          aria-label={t("tracks.openAlbum")}
          className="flex size-12 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {artwork}
        </Link>
      ) : (
        <span className="flex size-12 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {artwork}
        </span>
      )}

      <div className="min-w-0">
        <a
          href={`https://open.spotify.com/track/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 rounded-sm text-sm font-semibold leading-5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:line-clamp-1"
        >
          {name}
        </a>

        {metadata && (
          <p className="mt-0.5 truncate text-xs leading-5 text-muted-foreground">
            {metadata.artists.join(", ")}
          </p>
        )}

        {albumId && (
          <Link
            to={`/albums/${albumId}`}
            className="block truncate rounded-sm text-xs leading-5 text-muted-foreground/80 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {metadata?.albumName || t("tracks.openAlbum")}
          </Link>
        )}
      </div>

      <span className="hidden min-w-10 text-right text-xs tabular-nums text-muted-foreground sm:block">
        {metadata ? duration : ""}
      </span>

      <div className="col-start-2 flex flex-wrap items-center justify-between gap-x-2 sm:col-start-auto sm:justify-end">
        <TrackPreferenceControls
          name={name}
          preference={preference}
          disabled={disabled}
          onChange={(action, active) => onChange(item.id, action, active)}
        />
        {metadata && (
          <span className="text-xs tabular-nums text-muted-foreground sm:hidden">
            {duration}
          </span>
        )}
      </div>
    </li>
  );
}
