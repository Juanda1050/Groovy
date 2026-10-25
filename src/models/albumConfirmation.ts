export interface AlbumConfirmationProps {
  open: boolean;
  saving: boolean;
  disabled: boolean;
  errorKey: string | null;
  remainingSeconds: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
