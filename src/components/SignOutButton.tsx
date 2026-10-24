import { LogOut } from "lucide-react";
import { LoadingButton } from "@/components/LoadingButton";
import type { SignOutButtonProps } from "@/models/auth";

export function SignOutButton({ label, busy, onSignOut }: SignOutButtonProps) {
  return (
    <LoadingButton
      type="button"
      variant="outline"
      loading={busy}
      loadingLabel={label}
      onClick={() => void onSignOut()}
      className="w-full sm:w-auto"
    >
      <LogOut aria-hidden="true" className="size-4" />
      {label}
    </LoadingButton>
  );
}
