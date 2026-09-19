import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, LogOut, Menu, X, Home, LayoutDashboard, Layers, Bell, ClipboardCheck, Users, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { cn } from "../lib/utils.js";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

const navLinkClass = ({ isActive }) =>
  cn(
    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-95",
    isActive 
      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 hover:-translate-y-0.5 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
  );

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";

  const SidebarContent = () => {
    const { isDark, toggleDark } = useTheme();

    return (
      <div className="flex h-full flex-col dark:bg-slate-900/40">
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">TGMS Pro</span>
          </Link>
          <button onClick={toggleDark} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover:rotate-12 active:scale-95">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-8 flex flex-1 flex-col gap-1 px-4 overflow-y-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-4 mb-2">Main Menu</div>
          
          <NavLink to="/home" className={navLinkClass}>
            <Home className="h-5 w-5" />
            Home
          </NavLink>

          <NavLink to="/dashboard" className={navLinkClass}>
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>

          {isStudent && (
            <NavLink to="/student-groups" className={navLinkClass}>
              <Layers className="h-5 w-5" />
              Groups & Targets
            </NavLink>
          )}

          {(isTeacher || isAdmin) && (
            <>
              <NavLink to="/groups" className={navLinkClass}>
                <Users className="h-5 w-5" />
                Manage Groups
              </NavLink>
              <NavLink to="/bulk" className={navLinkClass}>
                <ClipboardCheck className="h-5 w-5" />
                Bulk Actions (CSV)
              </NavLink>
            </>
          )}

          <div className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-4 mb-2">Communication</div>
          <NavLink to="/notices" className={navLinkClass}>
            <Bell className="h-5 w-5" />
            Notice Board
          </NavLink>
        </div>

        <div className="mt-auto border-t border-slate-200/60 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-3 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 font-bold text-indigo-700 dark:text-indigo-300">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name}</span>
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.role}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300 overflow-hidden text-slate-900 dark:text-slate-100 animate-fade-in-up">
      {/* Ambient Pro Max Background */}
      <div className="pointer-events-none fixed top-0 left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-600/5 blur-[100px] z-0 mix-blend-multiply dark:mix-blend-lighten" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-orange-400/10 dark:bg-orange-600/5 blur-[120px] z-0 mix-blend-multiply dark:mix-blend-lighten" />
      
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl z-20 md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <div className={cn("fixed inset-0 z-50 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm transition-opacity md:hidden", sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <div className={cn("fixed inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl transition-transform duration-300", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <SidebarContent />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col z-10 min-w-0">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 sm:px-6 md:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="mr-3 p-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <Menu className="h-6 w-6" />
            </button>
            <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-lg font-bold text-slate-900 dark:text-white">TGMS Pro</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 relative">
          <div className="mx-auto max-w-7xl">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
