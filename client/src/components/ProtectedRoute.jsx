// Route guard: checks authentication + optional role allow-list, then renders the page
// inside the shared AppLayout shell.
//
//   <ProtectedRoute>                    → any authenticated user
//   <ProtectedRoute roles={["TEACHER"]}>→ teachers only
//
// Note: TGMS has exactly two roles — TEACHER and STUDENT. The `roles` list is generic so it
// could accept "ADMIN", but no ADMIN role exists in the backend schema.
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AppLayout from "./AppLayout.jsx";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading, isAuthenticated } = useAuth();

  // 1) Session still hydrating → spinner (never flash the login page).
  if (loading) {
    return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 animate-fade-in-up">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  // 2) Not logged in → login page.
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // 3) Wrong role → send them to the dashboard that fits their role.
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}