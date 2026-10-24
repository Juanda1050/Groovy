import type { ReactNode, RefObject, SyntheticEvent } from "react";
import type { ButtonProps } from "./ui";

export interface BlockingLoadingBindings {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
}

export interface LoadingOverlayProps extends BlockingLoadingBindings {
  label: string;
}

export type LoadingButtonProps = Omit<ButtonProps, "children" | "disabled"> & {
  children: ReactNode;
  loading: boolean;
  loadingLabel: string;
  disabled?: boolean;
};
