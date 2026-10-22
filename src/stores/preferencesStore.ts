import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PreferencesState, Theme } from "@/models/preferences";

function readPersistedTheme(value: unknown): Theme {
  if (
    typeof value === "object" &&
    value !== null &&
    "theme" in value &&
    value.theme === "light"
  ) {
    return "light";
  }

  return "dark";
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
      merge: (persisted: unknown, current) => ({
        ...current,
        theme: readPersistedTheme(persisted),
      }),
    },
  ),
);
