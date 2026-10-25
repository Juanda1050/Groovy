import { cva } from "class-variance-authority";

export const buttonSizes = {
  default: "h-auto min-h-9 py-1.5",
  xs: "h-auto min-h-7 py-1",
  sm: "h-auto min-h-8 py-1",
  lg: "h-auto min-h-10 py-1.5",
  icon: "size-8 min-h-8 p-0",
  "icon-xs": "size-7 min-h-7 p-0",
  "icon-sm": "size-8 min-h-8 p-0",
  "icon-lg": "size-10 min-h-10 p-0",
} as const;

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] shadow-sm",
        outline: "border-border bg-card text-foreground hover:bg-accent",
        secondary:
          "border-transparent bg-secondary text-foreground hover:bg-accent",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:opacity-90",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: [buttonSizes.default, "px-3"],
        xs: [buttonSizes.xs, "px-2 text-xs"],
        sm: [buttonSizes.sm, "px-2.5 text-xs"],
        lg: [buttonSizes.lg, "px-4 text-sm"],
        icon: buttonSizes.icon,
        "icon-xs": buttonSizes["icon-xs"],
        "icon-sm": buttonSizes["icon-sm"],
        "icon-lg": buttonSizes["icon-lg"],
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
