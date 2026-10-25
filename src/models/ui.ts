import type { ComponentProps } from "react";
import type { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/lib/buttonVariants";

export type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants>;

export type InputProps = ComponentProps<"input">;
export type TextareaProps = ComponentProps<"textarea">;
export type LabelProps = ComponentProps<"label">;
export type SurfaceProps = ComponentProps<"div">;

export type CardProps = SurfaceProps & {
  size?: "default" | "sm";
};

export type AlertProps = SurfaceProps & {
  variant?: "default" | "destructive";
};
