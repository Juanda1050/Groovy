import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { Theme } from "./preferences";

export interface GlassPanelProps extends ComponentPropsWithoutRef<"div"> {
  blur?: boolean;
}

export interface ThemeToggleProps {
  theme: Theme;
  label: string;
  onToggle: () => void;
}

export interface AppShellProps {
  children: ReactNode;
  actions: ReactNode;
  navigation?: ReactNode;
}
