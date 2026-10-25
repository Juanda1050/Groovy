import { useId } from "react";
import { useTranslation } from "react-i18next";

import { AvatarEditor } from "@/features/profile/components/AvatarEditor";
import { LoadingButton } from "@/shared/components/LoadingButton";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import type { ProfileFormProps } from "@/models/profile";

export function ProfileForm({
  values,
  labels,
  avatarUrl,
  fieldErrors,
  busy,
  disabled,
  canSubmit,
  dirty,
  feedback,
  feedbackTone,
  onChange,
  onBlur,
  onSubmit,
}: ProfileFormProps) {
  const { t } = useTranslation("profile");
  const id = useId();
  const error = feedbackTone === "error" ? feedback : null;

  return (
    <form
      noValidate
      aria-busy={busy}
      className="w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <AvatarEditor
        name={values.displayName}
        username={values.username}
        avatarPath={avatarUrl}
        disabled={disabled}
      />

      <fieldset disabled={disabled} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}Name`}>{labels.displayName}</Label>

            <Input
              id={`${id}Name`}
              name="displayName"
              autoComplete="nickname"
              value={values.displayName}
              maxLength={80}
              placeholder={t("fields.displayNamePlaceholder")}
              aria-invalid={Boolean(fieldErrors.displayName)}
              aria-describedby={
                fieldErrors.displayName ? `${id}NameError` : undefined
              }
              onBlur={() => onBlur("displayName")}
              onChange={(event) => onChange("displayName", event.target.value)}
            />

            {fieldErrors.displayName && (
              <p id={`${id}NameError`} className="text-xs text-destructive">
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${id}Username`}>{labels.username}</Label>

            <div className="relative">
              <span
                aria-hidden="true"
                className="
                  pointer-events-none absolute left-3 top-1/2
                  -translate-y-1/2 text-sm text-muted-foreground
                "
              >
                @
              </span>

              <Input
                id={`${id}Username`}
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={values.username}
                maxLength={30}
                placeholder={t("fields.usernamePlaceholder")}
                className="pl-8"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={`${id}UsernameHint`}
                onBlur={() => onBlur("username")}
                onChange={(event) => onChange("username", event.target.value)}
              />
            </div>

            <p
              id={`${id}UsernameHint`}
              className={`text-xs ${
                fieldErrors.username
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {fieldErrors.username || labels.usernameHint}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${id}Bio`}>{labels.bio}</Label>

            <span className="text-[11px] text-muted-foreground">
              {t("fields.optional")}
            </span>
          </div>

          <Textarea
            id={`${id}Bio`}
            name="bio"
            rows={3}
            maxLength={500}
            value={values.bio}
            placeholder={t("fields.bioPlaceholder")}
            aria-invalid={Boolean(fieldErrors.bio)}
            aria-describedby={`${id}BioFeedback`}
            onBlur={() => onBlur("bio")}
            onChange={(event) => onChange("bio", event.target.value)}
          />

          <div id={`${id}BioFeedback`} className="flex justify-between gap-3">
            <span className="text-xs text-destructive">{fieldErrors.bio}</span>

            <span className="text-[11px] tabular-nums text-muted-foreground">
              {values.bio.length} / 500
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {!dirty && !error ? t("feedback.noChanges") : ""}
          </p>

          <LoadingButton
            type="submit"
            loading={busy}
            loadingLabel={labels.submit}
            disabled={!canSubmit}
            className="min-h-11 w-full sm:w-auto"
          >
            {labels.submit}
          </LoadingButton>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
