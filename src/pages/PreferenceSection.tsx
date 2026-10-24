import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";

export function PreferencesSection() {
  const { t } = useTranslation("common");
  const { error, canRetry, retryLabel, onRetry, ...selectorProps } =
    useLanguage();

  return (
    <Card className="glassPanel w-full max-w-lg rounded-2xl">
      <CardHeader>
        <CardTitle>
          <h2>{t("preferences.title")}</h2>
        </CardTitle>

        <CardDescription>{t("preferences.description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <LanguageSelector {...selectorProps} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {canRetry && (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="w-full rounded-xl sm:w-auto"
          >
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
