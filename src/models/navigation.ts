import type { LucideIcon } from "lucide-react";

export type AppPath = "/" | "/library" | "/community" | "/profile";

export type NavigationLabelKey =
  | "navigation.discover"
  | "navigation.library"
  | "navigation.community"
  | "navigation.profile";

export interface NavigationItem {
  path: AppPath;
  label: string;
  icon: LucideIcon;
}

export interface NavigationDefinition {
  path: AppPath;
  labelKey: NavigationLabelKey;
  icon: LucideIcon;
}

export interface AppNavigationProps {
  items: readonly NavigationItem[];
  label: string;
}
