import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import type { Role } from "../api";

// only for the display, the API checks the role again
export default function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== role) return <p className="error">You are not allowed to see this page.</p>;
  return <>{children}</>;
}
