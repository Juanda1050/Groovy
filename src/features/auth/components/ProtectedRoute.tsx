import type { ProtectedRouteProps } from "@/models/auth";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { Navigate,Outlet } from "react-router-dom";

export function ProtectedRoute({ status }: ProtectedRouteProps) {
  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (status === "anonymous") {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
