import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Accent,
  AccentOption,
  PreferencesState,
} from "@/models/preferences";

const blueAccent: AccentOption = {
  value: "blue",
  light: "#12649e",
  lightHover: "#0d5286",
  dark: "#57b6ff",
  darkHover: "#77c4ff",
};

export const accentOptions: readonly AccentOption[] = [
  blueAccent,
  {
    value: "violet",
    light: "#7040b8",
    lightHover: "#5d329e",
    dark: "#c4a1ff",
    darkHover: "#d3b9ff",
  },
  {
    value: "rose",
    light: "#a52b59",
    lightHover: "#8c234b",
    dark: "#ff9bbb",
    darkHover: "#ffb5cd",
  },
  {
    value: "teal",
    light: "#087b70",
    lightHover: "#06665d",
    dark: "#64ddc5",
    darkHover: "#8ae6d3",
  },
];

export function getAccentPalette(accent: Accent): AccentOption {
  return accentOptions.find((option) => option.value === accent) ?? blueAccent;
}

function readPreferences(
  value: unknown,
): Pick<PreferencesState, "theme" | "accent"> {
  if (typeof value !== "object" || value === null) {
    return { theme: "dark", accent: "blue" };
  }

  const requestedAccent = "accent" in value ? value.accent : undefined;

  return {
    theme: "theme" in value && value.theme === "light" ? "light" : "dark",
    accent:
      accentOptions.find((option) => option.value === requestedAccent)?.value ??
      "blue",
  };
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "dark",
      accent: "blue",
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),
      setAccent: (accent) => set({ accent }),
    }),
    {
      name: "groovyPreferences",
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
      }),
      merge: (persisted: unknown, current) => ({
        ...current,
        ...readPreferences(persisted),
      }),
    },
  ),
);
