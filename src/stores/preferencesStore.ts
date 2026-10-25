import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Accent,
  AccentOption,
  PreferencesState,
} from "@/models/preferences";

const blueAccent: AccentOption = {
  value: "blue",
  hue: 250,
  chroma: 0.12,
  light: "#12649e",
  lightHover: "#0d5286",
  dark: "#57b6ff",
  darkHover: "#77c4ff",
  swatches: ["#57b6ff", "#12649e", "#10263f"],
};

export const accentOptions: readonly AccentOption[] = [
  blueAccent,
  {
    value: "violet",
    hue: 300,
    chroma: 0.12,
    light: "#7040b8",
    lightHover: "#5d329e",
    dark: "#c4a1ff",
    darkHover: "#d3b9ff",
    swatches: ["#c4a1ff", "#7040b8", "#291d3c"],
  },
  {
    value: "rose",
    hue: 350,
    chroma: 0.11,
    light: "#a52b59",
    lightHover: "#8c234b",
    dark: "#ff9bbb",
    darkHover: "#ffb5cd",
    swatches: ["#ff9bbb", "#a52b59", "#381e2a"],
  },
  {
    value: "teal",
    hue: 155,
    chroma: 0.1,
    light: "#18774b",
    lightHover: "#115d3a",
    dark: "#75d9a8",
    darkHover: "#99e5bf",
    swatches: ["#75d9a8", "#18774b", "#18352a"],
  },
  {
    value: "red",
    hue: 20,
    chroma: 0.1,
    light: "#b02b3d",
    lightHover: "#932133",
    dark: "#ff9caa",
    darkHover: "#ffb9c2",
    swatches: ["#ff9caa", "#b02b3d", "#391f24"],
  },
  {
    value: "brown",
    hue: 65,
    chroma: 0.08,
    light: "#85522f",
    lightHover: "#6b4024",
    dark: "#ddb492",
    darkHover: "#e8c9ad",
    swatches: ["#ddb492", "#85522f", "#33271f"],
  },
  {
    value: "neutral",
    hue: 260,
    chroma: 0,
    light: "#46464d",
    lightHover: "#303037",
    dark: "#dedee4",
    darkHover: "#f0f0f4",
    swatches: ["#dedee4", "#777780", "#232329"],
  },
  {
    value: "colorful",
    hue: 300,
    chroma: 0.13,
    light: "#703fba",
    lightHover: "#5b329c",
    dark: "#c5a3ff",
    darkHover: "#d7bfff",
    swatches: ["#c5a3ff", "#ff9bbb", "#75ddc6"],
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
