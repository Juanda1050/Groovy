import type { PageIntroProps } from '@/models/layout'

export function PageIntro({ title, description, eyebrow }: PageIntroProps) {
  return (
    <header className="max-w-3xl py-4 sm:py-8">
      {eyebrow && <p className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-primary">{eyebrow}</p>}
      <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-[-.045em] sm:text-5xl lg:text-6xl">{title}</h1>
      <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
    </header>
  )
}
