import { useRef } from "react";
import { Camera } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LoadingButton } from "@/components/LoadingButton";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useProfileAvatar } from "@/hooks/useProfile";

import type { AvatarEditorProps } from "@/models/profile";

export function AvatarEditor({
  name,
  username,
  avatarPath,
  disabled,
}: AvatarEditorProps) {
  const { t } = useTranslation("profile");
  const avatar = useProfileAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const blocked = disabled || avatar.busy;

  return (
    <div className="mb-6 space-y-3 border-b border-border/40 pb-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative shrink-0">
          <UserAvatar
            name={name}
            src={avatar.previewUrl ?? avatarPath}
            size="lg"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("avatar.choose")}
            title={t("avatar.choose")}
            disabled={blocked}
            className="
              absolute -bottom-2 -right-2 size-9
              rounded-full bg-background p-0 shadow-sm
            "
            onClick={() => inputRef.current?.click()}
          >
            <Camera aria-hidden="true" className="size-3.5" />
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={t("avatar.choose")}
            className="hidden"
            disabled={blocked}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";

              if (file) void avatar.onChoose(file);
            }}
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-semibold">
            {name.trim() || t("preview.name")}
          </p>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            @{username.trim() || t("preview.username")}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">{t("avatar.hint")}</p>

      {avatar.processing && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("avatar.processing")}
        </p>
      )}

      {avatar.hasDraft && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("avatar.preview")}</p>

          <div className="flex flex-wrap gap-2">
            <LoadingButton
              type="button"
              size="sm"
              loading={avatar.saving}
              loadingLabel={t("avatar.saving")}
              disabled={blocked}
              onClick={avatar.onSave}
            >
              {t("avatar.save")}
            </LoadingButton>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={blocked}
              onClick={avatar.onCancel}
            >
              {t("avatar.cancel")}
            </Button>
          </div>
        </div>
      )}

      {avatar.errorKey && (
        <p role="alert" className="text-xs leading-5 text-destructive">
          {t(avatar.errorKey)}
        </p>
      )}
    </div>
  );
}
