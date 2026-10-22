export type Theme = "dark" | "light";

export type SupportedLanguage = "en" | "es";

export interface PreferencesState {
  theme: Theme;
  toggleTheme: () => void;
}
