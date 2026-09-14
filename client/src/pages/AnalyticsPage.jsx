// Analytics — dashboard metrics + entry distribution (role-aware).
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, BookOpen, ClipboardList, Users } from "lucide-react";
import api from "../api/axios.js";

const ENTRY_COLORS = { PROJECT: "#8b5cf6", ASSIGNMENT: "#0ea5e9", NOTE: "#f59e0b", EXAM: "#10b981" };

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/analytics/dashboard");
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />;

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700">{error}</p>
        <button onClick={load} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const chartData = Object.entries(data.entryDistribution || {}).map(([type, count]) => ({
    type,
    count,
    fill: ENTRY_COLORS[type] || "#cbd5e1",
  }));

  const isTeacher = "totalStudents" in data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isTeacher ? (
          <>
            <Card icon={Users} label="Total students" value={data.totalStudents} sub="All enrolled" />
            <Card icon={BookOpen} label="Assigned subjects" value={data.teacherSubjects} sub="Subjects you can write to" />
            <Card icon={ClipboardList} label="Pending entries" value={data.pendingEntries} sub="Awaiting attention" />
            <Card icon={AlertCircle} label="Entry types" value={Object.keys(data.entryDistribution || {}).length || 0} sub="With recorded entries" />
          </>
        ) : (
          <>
            <Card icon={BookOpen} label="Total entries" value={data.totalEntries} sub="Across all subjects" />
            <Card icon={ClipboardList} label="ASSIGNMENT" value={data.entryDistribution?.ASSIGNMENT || 0} sub="Submitted by you" />
            <Card icon={BookOpen} label="EXAM" value={data.entryDistribution?.EXAM || 0} sub="Exams recorded" />
            <Card icon={BookOpen} label="PROJECT" value={data.entryDistribution?.PROJECT || 0} sub="Projects tracked" />
          </>
        )}
      </section>

      {chartData.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Entries by type</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {chartData.length === 0 && (
        <p className="text-sm text-slate-400">No entries recorded yet — analytics appear once teachers add progress.</p>
      )}
    </div>
  );
}

function Card({ icon: Icon, label, value, sub }) {
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