export type Theme = "dark" | "light";
export type SupportedLanguage = "en" | "es";
export type Accent = "blue" | "violet" | "rose" | "teal";

export interface AccentOption {
  value: Accent;
  light: string;
  lightHover: string;
  dark: string;
  darkHover: string;
}

export interface PreferencesState {
  theme: Theme;
  accent: Accent;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
}
