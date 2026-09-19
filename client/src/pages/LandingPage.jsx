// Public landing page — if already logged in, skip straight to the dashboard.
import { Link, Navigate } from "react-router-dom";
import { GraduationCap, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function LandingPage() {
  const { isDark, toggleDark } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 overflow-hidden animate-fade-in">
      {/* Theme Toggler */}
      <button onClick={toggleDark} className="absolute top-6 right-6 p-3 rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 shadow-sm transition-all duration-300 hover:rotate-12 active:scale-95 z-50">
        {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      </button>

      {/* Animated background blobs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 mix-blend-multiply blur-3xl animate-blob dark:bg-indigo-900/30"></div>
      <div className="absolute top-1/3 right-1/4 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-purple-500/20 mix-blend-multiply blur-3xl animate-blob dark:bg-purple-900/30" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-pink-500/20 mix-blend-multiply blur-3xl animate-blob dark:bg-pink-900/30" style={{ animationDelay: '4s' }}></div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        <div className="mb-6 flex justify-center animate-bounce-in">
          <div className="rounded-full bg-indigo-100 p-4 dark:bg-indigo-900/50 shadow-xl shadow-indigo-500/10">
            <GraduationCap className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white animate-fade-in-down">
          Teacher Guidance <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Management System
          </span>
        </h1>

        <p className="mb-10 text-lg text-slate-600 sm:text-xl max-w-xl mx-auto dark:text-slate-400 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          A unified platform for academic progress, group tasks, and transparent teacher-student collaboration.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-95"
          >
            Login to Portal
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-md ring-1 ring-inset ring-slate-200 transition-all duration-300 hover:bg-slate-50 hover:-translate-y-1 hover:shadow-lg active:scale-95 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            Register Student
          </Link>
        </div>

        <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link
            to="/register/teacher"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            Are you a Teacher/Admin? Register here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}