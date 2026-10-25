export type Theme = "dark" | "light";
export type SupportedLanguage = "en" | "es";

export type Accent =
  | "blue"
  | "violet"
  | "rose"
  | "teal"
  | "red"
  | "brown"
  | "neutral"
  | "colorful";

export interface AccentOption {
  value: Accent;
  hue: number;
  chroma: number;
  light: string;
  lightHover: string;
  dark: string;
  darkHover: string;
  swatches: readonly string[];
}

export interface PreferencesState {
  theme: Theme;
  accent: Accent;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
}
