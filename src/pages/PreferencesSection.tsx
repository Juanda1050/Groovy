import { LanguageSelector } from "@/components/LanguageSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export function PreferencesSection() {
  const {
    options,
    value,
    onChange,
    label,
    disabled,
    busy,
    message,
    error,
    canRetry,
    retrying,
    retryLabel,
    onRetry,
  } = useLanguage();

  return (
    <div className="relative inline-flex" aria-busy={busy}>
      <LanguageSelector
        options={options}
        value={value}
        onChange={onChange}
        label={label}
        disabled={disabled}
      />

      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </span>

      {error && (
        <Alert
          variant="destructive"
          className="
            absolute right-0 top-full z-50 mt-2
            w-64 max-w-[80vw] bg-popover shadow-lg
          "
        >
          <AlertDescription>{error}</AlertDescription>

          {canRetry && (
            <Button
              type="button"
              variant="link"
              disabled={retrying}
              onClick={onRetry}
              className="mt-1 px-0"
            >
              {retryLabel}
            </Button>
          )}
        </Alert>
      )}
    </div>
  );
}
