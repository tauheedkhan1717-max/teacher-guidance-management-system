import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LayoutDashboard, Users, Layers, TrendingUp, CheckSquare, Settings } from "lucide-react";
import { cn } from "../lib/utils.js";

const cards = [
  {
    title: "Dashboard",
    description: "View your timeline and progress overview",
    icon: LayoutDashboard,
    to: "/dashboard",
    color: "bg-indigo-500",
    roles: ["STUDENT", "TEACHER", "ADMIN"]
  },
  {
    title: "My Groups",
    description: "Check your academic groups and targets",
    icon: Layers,
    to: "/student-groups",
    color: "bg-blue-500",
    roles: ["STUDENT"]
  },
  {
    title: "Tasks & Assignments",
    description: "Submit custom tasks given by your teacher",
    icon: CheckSquare,
    to: "/tasks",
    color: "bg-emerald-500",
    roles: ["STUDENT"]
  },
  {
    title: "Manage Groups",
    description: "Create groups and enroll students",
    icon: Users,
    to: "/groups",
    color: "bg-blue-500",
    roles: ["TEACHER", "ADMIN"]
  },
  {
    title: "Personal Details",
    description: "View and edit your profile information",
    icon: Settings,
    to: "/profile",
    color: "bg-slate-500",
    roles: ["STUDENT", "TEACHER", "ADMIN"]
  }
];

export default function HomePage() {
  const { user } = useAuth();

  const visibleCards = cards.filter(c => c.roles.includes(user?.role));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-gradient-to-br from-indigo-900 to-indigo-600 dark:from-indigo-400 dark:to-indigo-200 bg-clip-text text-transparent">
          Welcome Home, {user?.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Navigate quickly to different sections of the portal.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link key={i} to={card.to} className="group relative rounded-3xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
              <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg mb-4", card.color)}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {card.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
