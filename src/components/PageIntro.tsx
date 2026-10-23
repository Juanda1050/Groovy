import type { PageIntroProps } from "@/models/layout";

export function PageIntro({ title, description, eyebrow }: PageIntroProps) {
  return (
    <header className="max-w-3xl">
      {eyebrow && (
        <p className="mb-4 text-sm font-medium text-primary">{eyebrow}</p>
      )}

      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        {title}
      </h1>

      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {description}
      </p>
    </header>
  );
}
