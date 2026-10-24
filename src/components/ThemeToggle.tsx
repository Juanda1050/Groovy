import { Moon, Sun } from 'lucide-react'
import type { ThemeToggleProps } from '@/models/layout'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ theme, label, onToggle }: ThemeToggleProps) {
  const Icon = theme === 'dark' ? Sun : Moon
  return <Button type="button" variant="outline" size="icon" onClick={onToggle} aria-label={label} title={label}><Icon aria-hidden="true" /></Button>
}
