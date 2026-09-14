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

  return (
    <div className="space-y-6">
      {/* ---------- Header / profile banner ---------- */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
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
              <GraduationCap className="h-3.5 w-3.5" /> STUDENT · Read-only
            </span>
            {memberships.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Layers className="h-3.5 w-3.5" />
                {memberships.length} group{memberships.length === 1 ? "" : "s"} enrolled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                <Layers className="h-3.5 w-3.5" />
                No groups yet
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", avgBadge)}>
              <Award className="h-3.5 w-3.5" />
              {averagePct !== null ? `${averagePct}% average` : "No marks yet"}
            </span>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Summary cards ---------- */}
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={ClipboardList} label="Total entries" value={totalEntries} sub="Progress records" />
        <SummaryCard
          icon={Award}
          label="Average score"
          value={averagePct !== null ? `${averagePct}%` : "—"}
          sub={`${scored.length} scored`}
        />
        <SummaryCard icon={TrendingUp} label="Teacher remarks" value={remarks.length} sub="Across all entries" />
      </section>

      {/* ---------- Progress timeline ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Your progress timeline</h2>
        {list.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {list.map((e) => {
              const pct = pctOf(e);
              return (
                <li key={e?.id ?? Math.random()} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          TYPE_STYLES[e?.type] || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {(e?.type || "ENTRY").replace("_", " ")}
                      </span>
                      <p className="truncate text-sm font-medium text-slate-800">{e?.title || "Untitled"}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Recorded {fmtDate(e?.recordedAt)}</p>
                    {e?.remark && <p className="mt-1 text-xs text-slate-500">“{e.remark}”</p>}
                  </div>
                  {pct !== null && (
                    <span className="shrink-0 text-xs font-semibold text-slate-700">
                      {e.marksObtained}/{e.maxMarks} ({pct}%)
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            No progress entries yet — your teachers haven't recorded anything.
          </p>
        )}
      </section>

      {/* ---------- Teacher remarks ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Teacher remarks</h2>
        {remarks.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {remarks.slice(0, 6).map((r, i) => (
              <li key={r?.id ?? i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
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

      {/* ---------- Your groups ---------- */}
      {memberships.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            Your academic groups
          </h2>
          <ul className="mt-4 space-y-3">
            {memberships.map((m) => (
              <li key={m.membershipId ?? Math.random()} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{m.group?.name || "Group"}</p>
                {m.group?.teacher ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Guide: {m.group.teacher.name || "—"}
                    {m.group.teacher.email ? ` · ${m.group.teacher.email}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Guide: —</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Joined {fmtDate(m.addedAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-300" />
            Your academic groups
          </h2>
          <p className="mt-2 text-sm text-slate-400">You are not enrolled in any group yet.</p>
        </section>
      )}

      {/* ---------- Read-only notice ---------- */}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        This is a read-only view. Only your teachers can add or edit progress records.
      </p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-indigo-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
