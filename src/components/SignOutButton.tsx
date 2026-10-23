import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SignOutButtonProps } from "@/models/auth";

export function SignOutButton({ label, busy, onSignOut }: SignOutButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={() => void onSignOut()}
      className="w-full rounded-xl sm:w-auto"
    >
      {busy ? (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}

      {label}
    </Button>
  );
}
