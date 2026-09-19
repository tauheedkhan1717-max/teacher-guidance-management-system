// Student Dashboard — strictly read-only.
// Fetches the signed-in student's own timeline via GET /api/progress/me and their
// group memberships via GET /api/students/me/memberships.
// Defensive rendering throughout — never white-screens on empty/malformed responses.
import { useCallback, useEffect, useState } from "react";
import {
  Award,
  ClipboardList,
  GraduationCap,
  Layers,
  Mail,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import api from "../api/axios.js";
import AnalyticsCard from "../components/AnalyticsCard.jsx";
import { cn } from "../lib/utils.js";
import { useAuth } from "../context/AuthContext.jsx";

const TYPE_STYLES = {
  UNIT_TEST: "bg-sky-100 text-sky-700",
  MICRO_PROJECT: "bg-violet-100 text-violet-700",
  END_SEM: "bg-emerald-100 text-emerald-700",
  ASSIGNMENT: "bg-amber-100 text-amber-700",
};

// Safe date formatter — never throws on null/invalid values.
function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

// Percentage for an entry, or null when marks are absent/invalid.
function pctOf(entry) {
  const m = Number(entry?.marksObtained);
  const max = Number(entry?.maxMarks);
  if (!Number.isFinite(m) || !Number.isFinite(max) || max <= 0) return null;
  return Math.round((m / max) * 100);
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    let entriesOk = false;
    let membershipsOk = false;
    try {
      const res = await api.get("/progress/me");
      const data = res.data?.entries ?? res.data ?? [];
      setEntries(Array.isArray(data) ? data : []);
      entriesOk = true;
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load your progress. Please try again.");
      setEntries([]);
    }
    try {
      const membersRes = await api.get("/students/me/memberships");
      const membersData = membersRes.data?.memberships ?? membersRes.data ?? [];
      setMemberships(Array.isArray(membersData) ? membersData : []);
      membershipsOk = true;
    } catch {
      // A student with no profile yet, or no memberships, can 404 here in the wild —
      // treat that as an empty list, not a white screen.
      setMemberships([]);
    }

    try {
      const attRes = await api.get("/attendance/me");
      setAttendance(attRes.data?.records || []);
    } catch {
      setAttendance([]);
    }
    if (entriesOk || membershipsOk) setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derived stats — computed defensively from a real array only.
  const list = Array.isArray(entries) ? entries : [];
  const totalEntries = list.length;
  const scored = list.filter((e) => pctOf(e) !== null);
  const averagePct = scored.length
    ? Math.round(scored.reduce((sum, e) => sum + pctOf(e), 0) / scored.length)
    : null;
  const remarks = list.filter((e) => e?.remark);
  const avgBadge =
    averagePct === null
      ? "bg-slate-200 text-slate-600"
      : averagePct >= 75
        ? "bg-emerald-100 text-emerald-700"
        : averagePct >= 40
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";

  
  const renderTabContent = () => {
    if (activeTab === "overview") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <section className="grid gap-4 sm:grid-cols-3">
            <SummaryCard icon={ClipboardList} label="Total entries" value={totalEntries} sub="Progress records" />
            <SummaryCard
              icon={Award}
              label="Average score"
              value={averagePct !== null ? `${averagePct}%` : "—"}
              sub={`${scored.length} scored`}
            />
            <SummaryCard 
              icon={TrendingUp} 
              label="Attendance" 
              value={attendance.length ? `${Math.round((attendance.filter(a => a.isPresent).length / attendance.length) * 100)}%` : "—"} 
              sub={`${attendance.length} total days`} 
            />
          </section>
          
          <AnalyticsCard studentId="me" />

          {/* Teacher remarks */}
          <section className="rounded-3xl border border-white/60 bg-white/70 p-6 sm:p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-slate-900">Teacher remarks</h2>
            {remarks.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {remarks.slice(0, 6).map((r, i) => (<li key={r?.id ?? i} className="rounded-xl border border-slate-100 bg-slate-50 p-4 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <p className="text-sm text-slate-700">“{r.remark}”</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {r?.title ? `${r.title} · ` : ""}
                      {fmtDate(r?.recordedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No remarks recorded yet.</p>
            )}
          </section>
        </div>
      );
    }
    
    if (activeTab === "attendance") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <section className="rounded-3xl border border-white/60 bg-white/70 p-6 sm:p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-slate-900">Attendance History</h2>
            {attendance.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {attendance.map((a, i) => (<li key={a.id} className="flex items-center justify-between py-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <span className="text-sm font-medium text-slate-800">{fmtDate(a.date)}</span>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", a.isPresent ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {a.isPresent ? "PRESENT" : "ABSENT"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No attendance records found.</p>
            )}
          </section>
        </div>
      );
    }

    // Progress Tabs (UNIT_TEST, ASSIGNMENT, END_SEM, MICRO_PROJECT)
    const filteredList = list.filter(e => e.type === activeTab);
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 sm:p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-slate-900">{activeTab.replace("_", " ")} Timeline</h2>
          {filteredList.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {filteredList.map((e) => {
                const pct = pctOf(e);
                return (
                  <li key={e?.id ?? Math.random()} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{e?.title || "Untitled"}</p>
                      <p className="mt-1 text-xs text-slate-500">Recorded {fmtDate(e?.recordedAt)}</p>
                      {e?.remark && <p className="mt-1 text-xs text-slate-500">“{e.remark}”</p>}
                    </div>
                    {pct !== null && (
                      <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                        {e.marksObtained}/{e.maxMarks} ({pct}%)
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No records found for this category.</p>
          )}
        </section>
      </div>
    );
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "attendance", label: "Attendance" },
    { id: "ASSIGNMENT", label: "Assignments" },
    { id: "UNIT_TEST", label: "Unit Tests" },
    { id: "END_SEM", label: "End Sem" },
    { id: "MICRO_PROJECT", label: "Micro Projects" },
  ];

  return (
    <div className="space-y-8">
      {/* ---------- Header ---------- */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"></div>
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-bold backdrop-blur-md border border-white/30">
                {user?.name?.charAt(0) || "S"}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.name || "Student"}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-indigo-100">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-4 w-4" /> {user?.email || "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                <GraduationCap className="h-3.5 w-3.5" /> STUDENT
              </span>
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 transition-transform active:scale-95"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Tabs ---------- */}
      <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-b-2",
              activeTab === tab.id 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---------- Tab Content ---------- */}
      {renderTabContent()}
      
      {/* ---------- Read-only notice ---------- */}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400 mt-8">
        <ShieldCheck className="h-3.5 w-3.5" />
        This is a read-only view. Only your teachers can edit progress records.
      </p>
    </div>
  );
}


function SummaryCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-indigo-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
