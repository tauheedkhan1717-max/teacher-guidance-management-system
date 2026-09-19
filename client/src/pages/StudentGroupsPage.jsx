import { useEffect, useState } from "react";
import { Layers, ShieldCheck, RefreshCw } from "lucide-react";
import api from "../api/axios.js";
import AnalyticsCard from "../components/AnalyticsCard.jsx";
import { cn } from "../lib/utils.js";

export default function StudentGroupsPage() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/bulk/my-memberships");
      setMemberships(res.data.memberships || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-gradient-to-br from-indigo-900 to-indigo-600 bg-clip-text text-transparent">
            Groups & Targets
          </h1>
          <p className="text-sm text-slate-500 mt-1">View your group enrollments and academic targets.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      <AnalyticsCard studentId="me" />

      {memberships.length > 0 ? (
        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 sm:p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            Your Enrolled Groups
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <div key={m.membershipId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-base font-bold text-slate-900">{m.group?.name || "Group"}</p>
                <div className="mt-3 space-y-1">
                  {m.group?.teacher ? (
                    <>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Guide:</span> {m.group.teacher.name || "—"}
                      </p>
                      <p className="text-xs text-slate-500">{m.group.teacher.email}</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Guide: —</p>
                  )}
                  <p className="mt-3 text-xs text-slate-400">
                    Joined {new Date(m.addedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 sm:p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl text-center py-12">
          <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-900">No Groups Found</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            You are not currently enrolled in any academic groups. Wait for a teacher to assign you.
          </p>
        </section>
      )}
      
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        This is a read-only view. Only teachers can manage groups and set targets.
      </p>
    </div>
  );
}
