// /dashboard — role-based redirect to the correct dashboard (no content of its own).
//   ADMIN   → /admin-dashboard
//   TEACHER → /teacher-dashboard
//   STUDENT → /student-dashboard
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  // Session still hydrating → spinner (never flash a redirect loop).
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  const target =
    user?.role === "ADMIN" ? "/admin-dashboard"
    : user?.role === "TEACHER" ? "/teacher-dashboard"
    : user?.role === "STUDENT" ? "/student-dashboard"
    : "/login";

  return <Navigate to={target} replace />;
}