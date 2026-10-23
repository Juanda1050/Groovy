import { NavLink } from "react-router-dom";
import type { AppNavigationProps } from "@/models/navigation";
import { cn } from "@/lib/utils";

export function AppNavigation({ items, label }: AppNavigationProps) {
  return (
    <nav
      aria-label={label}
      className="
        glassPanel glassBlur fixed inset-x-3 bottom-3 z-30
        rounded-2xl p-1
        pb-[max(0.25rem,env(safe-area-inset-bottom))]
        md:static md:border-0 md:bg-transparent
        md:p-0 md:backdrop-blur-none
      "
    >
      <ul className="flex items-center justify-around gap-1 md:gap-2">
        {items.map(({ path, label: itemLabel, icon: Icon }) => (
          <li key={path} className="min-w-0 flex-1 md:flex-none">
            <NavLink
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-h-12 flex-col items-center justify-center",
                  "gap-1 rounded-xl px-2 py-2 text-xs font-medium",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-ring",
                  "md:min-h-11 md:flex-row md:gap-2 md:px-3 md:text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span>{itemLabel}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
