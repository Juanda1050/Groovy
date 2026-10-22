import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

interface PreferencesState {
  theme: Theme;
  toggleTheme: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),
    }),
    {
      name: "groovyPreferences",
      partialize: (state) => ({ theme: state.theme }),
      merge: (persisted, current) => {
        const saved = persisted as { theme?: unknown } | undefined;

        return {
          ...current,
          theme: saved?.theme === "light" ? "light" : "dark",
        };
      },
    },
  ),
);
