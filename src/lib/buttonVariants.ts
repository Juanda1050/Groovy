import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] shadow-sm',
        outline: 'border-border bg-card text-foreground hover:bg-accent',
        secondary: 'border-transparent bg-secondary text-foreground hover:bg-accent',
        ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:opacity-90',
        link: 'border-transparent bg-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 px-5 py-2.5',
        xs: 'min-h-11 px-3 py-2 text-xs',
        sm: 'min-h-11 px-3.5 py-2',
        lg: 'min-h-12 px-6 py-3 text-base',
        icon: 'size-11 p-0',
        'icon-xs': 'size-11 p-0',
        'icon-sm': 'size-11 p-0',
        'icon-lg': 'size-12 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
