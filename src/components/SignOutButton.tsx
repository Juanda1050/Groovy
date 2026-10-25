import { LogOut } from "lucide-react";
import { LoadingButton } from "@/components/LoadingButton";
import type { SignOutButtonProps } from "@/models/auth";

export function SignOutButton({ label, busy, onSignOut }: SignOutButtonProps) {
  return (
    <LoadingButton
      type="button"
      variant="ghost"
      loading={busy}
      loadingLabel={label}
      onClick={() => void onSignOut()}
      className="min-h-11 w-full justify-start rounded-lg bg-red-500/5 px-3 text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
    >
      <LogOut aria-hidden="true" className="size-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </LoadingButton>
  );
}
