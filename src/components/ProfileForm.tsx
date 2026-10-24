import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileFormProps } from "@/models/profile";

export function ProfileForm({
  values,
  labels,
  busy,
  disabled,
  feedback,
  feedbackTone,
  onChange,
  onSubmit,
}: ProfileFormProps) {
  return (
    <form
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="w-full max-w-lg"
    >
      <fieldset disabled={disabled} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="profileDisplayName">{labels.displayName}</Label>

          <Input
            id="profileDisplayName"
            name="displayName"
            autoComplete="nickname"
            value={values.displayName}
            maxLength={80}
            required
            onChange={(event) => {
              onChange("displayName", event.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profileUsername">{labels.username}</Label>

          <Input
            id="profileUsername"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={values.username}
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9_]{3,30}"
            aria-describedby="profileUsernameHint"
            required
            onChange={(event) => {
              onChange("username", event.target.value);
            }}
          />

          <p
            id="profileUsernameHint"
            className="text-xs leading-5 text-muted-foreground"
          >
            {labels.usernameHint}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profileBio">{labels.bio}</Label>

          <Input
            id="profileBio"
            name="bio"
            value={values.bio}
            maxLength={500}
            onChange={(event) => {
              onChange("bio", event.target.value);
            }}
          />
        </div>

        <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
          {busy && (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 motion-safe:animate-spin"
            />
          )}

          {labels.submit}
        </Button>
      </fieldset>

      {feedback && (
        <p
          role={feedbackTone === "error" ? "alert" : "status"}
          className={
            feedbackTone === "error"
              ? "mt-4 text-sm text-destructive"
              : "mt-4 text-sm text-primary"
          }
        >
          {feedback}
        </p>
      )}
    </form>
  );
}
