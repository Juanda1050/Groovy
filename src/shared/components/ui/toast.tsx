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
        "pointer-events-none fixed inset-x-3 z-80 mx-auto",
        "bottom-[calc(env(safe-area-inset-bottom,0px)+6rem)]",
        "w-auto max-w-80 outline-none",
        "md:bottom-5 md:left-auto md:right-5 md:mx-0 md:w-80",
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
        "rounded-xl border border-border/70 bg-popover/95",
        "bg-linear-to-br from-popover to-primary/5 backdrop-blur-xl",
        "data-[type=success]:border-like/25 data-[type=success]:to-like/5",
        "data-[type=error]:border-destructive/25 data-[type=error]:to-destructive/5",
        "data-[type=warning]:border-rating/25 data-[type=warning]:to-rating/5",
        "text-popover-foreground outline-none",
        "shadow-[0_12px_36px_-12px_rgb(0_0_0/30%),0_2px_6px_rgb(0_0_0/8%)]",
        "select-none will-change-transform",
        "focus-visible:border-ring focus-visible:ring-[3px]",
        "focus-visible:ring-ring/50",
        "[--gap:0.625rem]",
        "[--height:var(--toast-frontmost-height,var(--toast-height))]",
        "[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
        "[--peek:0.5rem]",
        "[--scale:calc(max(0,1-(var(--toast-index)*0.04)))]",
        "[--shrink:calc(1-var(--scale))]",
        "h-(--height)",
        "transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
        "[transition:transform_280ms_cubic-bezier(0.22,1,0.36,1),opacity_180ms,height_180ms]",
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
        "flex h-full items-center gap-2.5 overflow-hidden px-3 py-2.5",
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
      className={cn(
        "wrap-break-word text-[13px] font-semibold leading-5",
        className,
      )}
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
        "wrap-break-word text-xs leading-4 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="outline" size="xs" />,
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
  render = <Button variant="ghost" size="icon-xs" />,
  ...props
}: ToastPrimitive.Close.Props) {
  const { t } = useTranslation("common");

  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label={t("notifications.close")}
      render={render}
      className={cn(
        "relative size-7 shrink-0 rounded-md",
        "text-muted-foreground/70 hover:bg-muted/70 hover:text-foreground",
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
      : type === "warning"
        ? TriangleAlertIcon
        : type === "error"
          ? OctagonXIcon
          : type === "loading"
            ? Loader2Icon
            : InfoIcon;

  const tone =
    type === "success"
      ? "bg-like/10 text-like ring-like/15"
      : type === "error"
        ? "bg-destructive/10 text-destructive ring-destructive/15"
        : type === "warning"
          ? "bg-rating/10 text-rating ring-rating/15"
          : "bg-primary/10 text-primary ring-primary/15";

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
        tone,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4",
          type === "loading" && "motion-safe:animate-spin",
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

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
  ToastDescription,
  Toaster,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
};
