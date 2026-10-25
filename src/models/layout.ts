import type { Theme } from "@/models/preferences";
import type { ComponentPropsWithoutRef,ReactNode } from "react";

export interface GlassPanelProps extends ComponentPropsWithoutRef<"div"> {
  blur?: boolean;
}

export interface ThemeToggleProps {
  theme: Theme;
  label: string;
  onToggle: () => void;
}

export interface AppShellProps {
  skipLabel: string;
  children: ReactNode;
  actions: ReactNode;
  navigation?: ReactNode;
}

export interface PageIntroProps {
  title: string;
  description: string;
  eyebrow?: string;
}
