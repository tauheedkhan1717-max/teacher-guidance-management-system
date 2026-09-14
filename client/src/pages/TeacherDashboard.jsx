// Teacher Dashboard — student directory with a quick "Add Progress" action (Progress MVP).
// Fetches GET /api/students (TEACHER/ADMIN), shows a responsive table, and opens a small
// modal to POST /api/progress for the selected student.
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const PROGRESS_TYPES = ["UNIT_TEST", "MICRO_PROJECT", "END_SEM", "ASSIGNMENT"];

const EMPTY_FORM = { type: "UNIT_TEST", title: "", marksObtained: "", maxMarks: "", remark: "" };

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add-progress modal state.
  const [modalStudent, setModalStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/students");
      const data = res.data?.students ?? res.data ?? [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  function openModal(student) {
    setModalStudent(student);
    setForm({ ...EMPTY_FORM });
    setFormError("");
  }

  function closeModal() {
    setModalStudent(null);
  }

  async function submitProgress(e) {
    e.preventDefault();
    setFormError("");
    const payload = {
      studentId: modalStudent.id,
      type: form.type,
      title: form.title.trim(),
      marksObtained: form.marksObtained === "" ? undefined : Number(form.marksObtained),
      maxMarks: form.maxMarks === "" ? undefined : Number(form.maxMarks),
      remark: form.remark.trim() || undefined,
    };
    if (!payload.title) {
      setFormError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/progress", payload);
      setSuccessMessage(`Progress recorded for ${modalStudent.user?.name ?? modalStudent.rollNumber}.`);
      setModalStudent(null);
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || "Failed to save progress.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome, {user?.name}. {students.length} active student{students.length === 1 ? "" : "s"} enrolled.
          </p>
        </div>
        <button
          onClick={fetchStudents}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {successMessage && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          ✅ {successMessage}
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Roll No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Year</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Phone</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading students…</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No active students found.</td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.user?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{s.rollNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.user?.email || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.yearOfAdmission}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openModal(s)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Add Progress
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Progress modal */}
      {modalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900">
              Add Progress — {modalStudent.user?.name || modalStudent.rollNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Roll No: {modalStudent.rollNumber}</p>

            {formError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <form onSubmit={submitProgress} className="mt-4 space-y-4">
              <div>
                <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {PROGRESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. UT-1 Differential Equations"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="marksObtained" className="mb-1 block text-sm font-medium text-slate-700">Marks obtained</label>
                  <input
                    id="marksObtained"
                    type="number"
                    min="0"
                    value={form.marksObtained}
                    onChange={(e) => setForm({ ...form, marksObtained: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="maxMarks" className="mb-1 block text-sm font-medium text-slate-700">Max marks</label>
                  <input
                    id="maxMarks"
                    type="number"
                    min="0"
                    value={form.maxMarks}
                    onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="remark" className="mb-1 block text-sm font-medium text-slate-700">Remark (optional)</label>
                <textarea
                  id="remark"
                  rows="2"
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving…" : "Save Progress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}