import type { ComponentProps } from "react";
import type { Select as SelectPrimitive } from "@base-ui/react/select";

export type SelectGroupProps = SelectPrimitive.Group.Props;

export type SelectValueProps = SelectPrimitive.Value.Props;

export type SelectTriggerProps = SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
};

export type SelectContentProps = SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >;

export type SelectLabelProps = SelectPrimitive.GroupLabel.Props;

export type SelectItemProps = SelectPrimitive.Item.Props;

export type SelectSeparatorProps = SelectPrimitive.Separator.Props;

export type SelectScrollUpProps = ComponentProps<
  typeof SelectPrimitive.ScrollUpArrow
>;

export type SelectScrollDownProps = ComponentProps<
  typeof SelectPrimitive.ScrollDownArrow
>;
