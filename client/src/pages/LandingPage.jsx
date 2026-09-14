// Public landing page — if already logged in, skip straight to the dashboard.
import { Link, Navigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <GraduationCap className="h-9 w-9 text-indigo-600" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900">TGMS</h1>
        <p className="mt-2 text-slate-600">
          Teacher Guidance Management System — teachers record student academic progress in one
          place, students see their own records in real time.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-700"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-center font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            New student? Register
          </Link>
        </div>
      </div>
    </div>
  );
}