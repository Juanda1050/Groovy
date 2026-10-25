import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
CircleCheckIcon,
InfoIcon,
Loader2Icon,
OctagonXIcon,
TriangleAlertIcon,
XIcon,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

function ToastProvider(props: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal(props: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  const { t } = useTranslation("common");

  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      aria-label={t("notifications.label")}
      className={cn(
        "pointer-events-none fixed inset-x-4 z-50 mx-auto",
        "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]",
        "w-auto max-w-sm outline-none",
        "sm:left-auto sm:right-6 sm:mx-0 sm:w-full",
        className,
      )}
      {...props}
    />
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute bottom-0 right-0",
        "z-[calc(1000-var(--toast-index))] w-full origin-bottom",
        "rounded-2xl border border-border bg-popover",
        "text-popover-foreground shadow-lg outline-none",
        "select-none will-change-transform",
        "focus-visible:border-ring focus-visible:ring-[3px]",
        "focus-visible:ring-ring/50",
        "[--gap:0.75rem]",
        "[--height:var(--toast-frontmost-height,var(--toast-height))]",
        "[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
        "[--peek:0.75rem]",
        "[--scale:calc(max(0,1-(var(--toast-index)*0.1)))]",
        "[--shrink:calc(1-var(--scale))]",
        "h-(--height)",
        "transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
        "[transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
        "after:absolute after:left-0 after:top-full",
        "after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height)",
        "data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0",
        "data-starting-style:transform-[translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden p-4",
        "transition-opacity duration-250",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
        "data-behind:opacity-0 data-expanded:opacity-100",
        "motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("wrap-break-word text-sm font-medium leading-5", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        "wrap-break-word text-xs leading-5 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon" />,
  ...props
}: ToastPrimitive.Close.Props) {
  const { t } = useTranslation("common");

  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label={t("notifications.close")}
      render={render}
      className={cn(
        "relative size-8 shrink-0 rounded-lg",
        "text-muted-foreground hover:text-foreground",
        "after:absolute after:-inset-1.5 after:content-['']",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" className="size-4" />}
    </ToastPrimitive.Close>
  );
}

function ToastIcon({ type }: { type: string | undefined }) {
  const Icon =
    type === "success"
      ? CircleCheckIcon
      : type === "info"
        ? InfoIcon
        : type === "warning"
          ? TriangleAlertIcon
          : type === "error"
            ? OctagonXIcon
            : type === "loading"
              ? Loader2Icon
              : null;

  if (!Icon) return null;

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        "shrink-0",
        type === "error" || type === "warning"
          ? "text-destructive"
          : "text-primary",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4",
          type === "loading" && "animate-spin motion-reduce:animate-none",
        )}
      />
    </span>
  );
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((item) => (
    <Toast key={item.id} toast={item}>
      <ToastContent>
        <ToastIcon type={item.type} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {item.title && <ToastTitle />}
          {item.description && <ToastDescription />}
        </div>

        {item.actionProps && <ToastAction {...item.actionProps} />}

        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

function Toaster({
  children,
  toastManager = toast,
  timeout = 2600,
  limit = 2,
  ...props
}: ToastPrimitive.Provider.Props) {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  React.useEffect(() => {
    toastManager.close();
  }, [userId, toastManager]);

  return (
    <ToastProvider
      toastManager={toastManager}
      timeout={timeout}
      limit={limit}
      {...props}
    >
      {children}

      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

export {
Toast,
ToastAction,
ToastClose,
ToastContent,
ToastDescription,Toaster,ToastPortal,
ToastProvider,
ToastTitle,
ToastViewport
};
