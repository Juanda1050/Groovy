import { NavLink } from 'react-router-dom'
import type { AppNavigationProps } from '@/models/navigation'
import { cn } from '@/lib/utils'

export function AppNavigation({ items, label }: AppNavigationProps) {
  return (
    <nav aria-label={label} className="appNavigation glassPanel glassBlur fixed inset-x-3 bottom-3 z-30 rounded-2xl p-1.5 pb-[max(.375rem,env(safe-area-inset-bottom))] shadow-lg md:static md:p-0 md:shadow-none">
      <ul className="flex items-center justify-around gap-1 md:gap-1 lg:gap-2">
        {items.map(({ path, label: itemLabel, icon: Icon }) => (
          <li key={path} className="min-w-0 flex-1 md:flex-none">
            <NavLink to={path} end={path === '/'} className={({ isActive }) => cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-medium transition-colors md:min-h-11 md:flex-row md:gap-2 md:px-3 md:text-sm lg:px-4',
              isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}>
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span>{itemLabel}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
