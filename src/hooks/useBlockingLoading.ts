import { useLayoutEffect, useRef } from "react";
import type { BlockingLoadingBindings } from "@/models/loading";

export function useBlockingLoading(active: boolean): BlockingLoadingBindings {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (!active || !dialog) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  return {
    dialogRef,
    onCancel: (event) => {
      event.preventDefault();
    },
  };
}
