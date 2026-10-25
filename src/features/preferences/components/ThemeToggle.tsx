import type { ThemeToggleProps } from "@/models/layout";
import { Button } from "@/shared/components/ui/button";
import { Moon,Sun } from 'lucide-react';

export function ThemeToggle({ theme, label, onToggle }: ThemeToggleProps) {
  const Icon = theme === 'dark' ? Sun : Moon
  return <Button type="button" variant="outline" size="icon" onClick={onToggle} aria-label={label} title={label}><Icon aria-hidden="true" /></Button>
}
