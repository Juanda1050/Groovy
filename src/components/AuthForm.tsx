import { LoaderCircle } from "lucide-react";
import type { AuthFormProps } from "@/models/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  title,
  description,
  fields,
  values,
  feedback,
  busy,
  submitLabel,
  switchLabel,
  onChange,
  onSubmit,
  onSwitch,
}: AuthFormProps) {
  return (
    <form
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="min-w-0"
    >
      <CardHeader className="gap-3 px-5 pb-6 sm:px-8">
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
        </CardTitle>

        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 sm:px-8">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`auth${field.name}`}>{field.label}</Label>

              <Input
                id={`auth${field.name}`}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                minLength={field.minLength}
                maxLength={field.maxLength}
                value={values[field.name]}
                required
                onChange={(event) => {
                  onChange(field.name, event.target.value);
                }}
                className="rounded-xl"
              />
            </div>
          ))}

          {feedback && (
            <Alert role="status" className="rounded-xl bg-background/70">
              <AlertDescription className="[overflow-wrap:anywhere]">
                {feedback}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 pt-1">
            <Button type="submit" disabled={busy} size="lg" className="w-full rounded-xl">
              {busy && (
                <LoaderCircle
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              )}

              {submitLabel}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onSwitch}
              className="
                h-auto w-full whitespace-normal
                rounded-xl px-3 py-3 text-center
              "
            >
              {switchLabel}
            </Button>
          </div>
        </fieldset>
      </CardContent>
    </form>
  );
}
