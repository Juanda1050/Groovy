import { BrandMark } from './BrandMark'
import type { AuthArtworkProps } from '@/models/auth'

export function AuthArtwork({ eyebrow, title, description }: AuthArtworkProps) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-8 py-2 lg:py-8">
      <div>
        <p className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-primary">{eyebrow}</p>
        <h2 className="max-w-lg text-balance text-4xl font-semibold leading-[1.08] tracking-[-.05em] sm:text-5xl xl:text-6xl">{title}</h2>
        <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      <div className="authArtwork hidden min-h-72 items-center justify-center lg:flex" aria-hidden="true">
        <div className="recordDisc"><div className="recordLabel">Groovy</div></div>
      </div>
      <div className="hidden items-center gap-3 lg:flex"><BrandMark /><span className="text-sm font-medium text-muted-foreground">Groovy</span></div>
    </div>
  )
}
