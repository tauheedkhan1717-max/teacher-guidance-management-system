// Phase 9 — Teacher: student directory.
// Search by name/roll, filter by class; each row links to the full student record.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import api from "../api/axios.js";

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (classId) params.classId = classId;
      const res = await api.get("/students", { params });
      setStudents(res.data.students || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [search, classId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get("/classes").then((res) => setClasses(res.data.classes || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">{students.length} enrolled student{students.length === 1 ? "" : "s"}</p>
        </div>
        <Link
          to="/progress"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Add progress
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or roll number…"
            className={inputClass + " pl-9"}
          />
        </div>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass + " sm:w-64"}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.section}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button onClick={load} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-slate-500">No students match your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Roll</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Class &amp; Section</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Batch</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Admission</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{s.rollNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.user.name}</td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {s.class.name} — {s.class.section}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{s.batch}</td>
                  <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{s.yearOfAdmission}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/students/${s.id}`}
                      className="inline-block rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}