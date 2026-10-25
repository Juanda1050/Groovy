import { PasswordRules } from "@/features/auth/components/PasswordRules";
import type { AuthFormProps } from "@/models/auth";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Alert,AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { CardContent,CardDescription,CardHeader,CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Eye,EyeOff } from "lucide-react";
import { useId } from "react";

export function AuthForm({
  title,
  description,
  fields,
  values,
  fieldErrors,
  passwordRules,
  feedback,
  feedbackTone,
  busy,
  canSubmit,
  submitLabel,
  switchLabel,
  onChange,
  onSubmit,
  onSwitch,
}: AuthFormProps) {
  const formId = useId();

  return (
    <form
      noValidate
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

        <CardDescription className="leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 sm:px-8">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {fields.map((field) => {
            const inputId = `${formId}-${field.name}`;
            const errorId = `${inputId}-error`;
            const rulesId = `${inputId}-rules`;
            const error = fieldErrors[field.name];

            const hasPasswordRules =
              field.name === "password" && passwordRules !== null;

            const describedBy =
              [error ? errorId : "", hasPasswordRules ? rulesId : ""]
                .filter(Boolean)
                .join(" ") || undefined;

            const VisibilityIcon = field.type === "password" ? Eye : EyeOff;

            return (
              <div key={field.name} className="group/authField space-y-2">
                <Label htmlFor={inputId}>{field.label}</Label>

                <div className="relative">
                  <Input
                    id={inputId}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    inputMode={field.inputMode}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    value={values[field.name]}
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    onChange={(event) => {
                      onChange(field.name, event.target.value);
                    }}
                    className={field.onToggleVisibility ? "pr-12" : undefined}
                  />

                  {field.onToggleVisibility && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      aria-label={field.visibilityLabel}
                      title={field.visibilityLabel}
                      onClick={field.onToggleVisibility}
                      className="
                        absolute right-0.5 top-1/2
                        -translate-y-1/2 border-0
                      "
                    >
                      <VisibilityIcon aria-hidden="true" className="size-4" />
                    </Button>
                  )}
                </div>

                {error && (
                  <p
                    id={errorId}
                    className="text-xs leading-5 text-destructive"
                  >
                    {error}
                  </p>
                )}

                {hasPasswordRules && passwordRules && (
                  <div
                    id={rulesId}
                    className="hidden group-focus-within/authField:block"
                  >
                    <PasswordRules {...passwordRules} />
                  </div>
                )}
              </div>
            );
          })}

          {feedback && (
            <Alert
              variant={feedbackTone === "error" ? "destructive" : "default"}
              role={feedbackTone === "error" ? "alert" : "status"}
            >
              <AlertDescription>{feedback}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 pt-1">
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit || busy}
              className="w-full"
            >
              {busy && <RecordLoader />}
              {submitLabel}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onSwitch}
              className="h-auto w-full whitespace-normal py-3"
            >
              {switchLabel}
            </Button>
          </div>
        </fieldset>
      </CardContent>
    </form>
  );
}
