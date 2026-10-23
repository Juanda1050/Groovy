import { Compass, Library, Users, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NavigationDefinition, NavigationItem } from "@/models/navigation";

const definitions: readonly NavigationDefinition[] = [
  {
    path: "/",
    labelKey: "navigation.discover",
    icon: Compass,
  },
  {
    path: "/library",
    labelKey: "navigation.library",
    icon: Library,
  },
  {
    path: "/community",
    labelKey: "navigation.community",
    icon: Users,
  },
  {
    path: "/profile",
    labelKey: "navigation.profile",
    icon: UserRound,
  },
];

export function useAppNavigation() {
  const { t } = useTranslation("common");

  const items: readonly NavigationItem[] = definitions.map(
    ({ path, labelKey, icon }) => ({
      path,
      label: t(labelKey),
      icon,
    }),
  );

  return {
    items,
    label: t("navigation.label"),
  };
}
