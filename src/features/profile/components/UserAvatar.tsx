import { useAvatarUrl } from "@/features/profile/hooks/useProfileAvatar";
import type { UserAvatarProps } from "@/models/profile";
import { useState } from "react";

export function UserAvatar({ name, src, size = "sm" }: UserAvatarProps) {
  const avatar = useAvatarUrl(src);

  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [refreshedIdentity, setRefreshedIdentity] = useState<string | null>(
    null,
  );

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toLocaleUpperCase() || "G";

  const large = size === "lg";
  const imageUrl = avatar.src;
  const imageKey = `${avatar.identity}:${avatar.version}:${imageUrl ?? ""}`;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary ring-1 ring-primary/20 ${
        large ? "size-16 text-lg" : "size-9 text-xs"
      }`}
    >
      {imageUrl && imageKey !== failedImage ? (
        <img
          key={imageKey}
          src={imageUrl}
          alt=""
          width={large ? 64 : 36}
          height={large ? 64 : 36}
          decoding="async"
          className="size-full object-cover"
          onError={() => {
            setFailedImage(imageKey);

            if (
              !avatar.direct &&
              src &&
              refreshedIdentity !== avatar.identity
            ) {
              setRefreshedIdentity(avatar.identity);
              void avatar.refresh();
            }
          }}
        />
      ) : (
        initials
      )}
    </span>
  );
}
