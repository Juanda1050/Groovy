import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isLocalAuthBypassEnabled } from "@/lib/localDevelopment";
import { useAuthStore } from "@/stores/authStore";

export default function ProtectedLayout() {
  const status = useAuthStore((state) => state.status);

  if (isLocalAuthBypassEnabled) {
    return <Outlet />;
  }

  return <ProtectedRoute status={status} />;
}
