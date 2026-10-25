import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/components/ui/button";

export function CommentActionsMenu({
  disabled,
  onEdit,
  onDelete,
}: {
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("community");
  const selected = useRef(false);

  return (
    <Menu.Root
      onOpenChange={(next) => {
        if (next) selected.current = false;
      }}
    >
      <Menu.Trigger
        disabled={disabled}
        render={
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 size-11 shrink-0 rounded-md"
          />
        }
        aria-label={t("comments.options")}
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="z-60">
          <Menu.Popup
            finalFocus={() => !selected.current}
            className="min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none"
          >
            <Menu.Item
              disabled={disabled}
              onClick={() => {
                selected.current = true;
                onEdit();
              }}
              className="flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm outline-none data-highlighted:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50"
            >
              {t("comments.edit")}
            </Menu.Item>

            <Menu.Item
              disabled={disabled}
              onClick={() => {
                selected.current = true;
                onDelete();
              }}
              className="flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm text-destructive outline-none data-highlighted:bg-destructive/10 data-disabled:pointer-events-none data-disabled:opacity-50"
            >
              {t("comments.delete")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
