import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";

export default function ProtectedLayout() {
  const status = useAuthStore((state) => state.status);

  return <ProtectedRoute status={status} />;
}
