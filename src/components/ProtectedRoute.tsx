import { Navigate, Outlet } from "react-router-dom";
import type { ProtectedRouteProps } from "@/models/auth";
import { PageSkeleton } from "./PageSkeleton";

export function ProtectedRoute({ status }: ProtectedRouteProps) {
  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (status === "anonymous") {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
