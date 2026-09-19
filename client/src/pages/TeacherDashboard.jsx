// Teacher Dashboard — student directory + bulk operations.
// Checkboxes select students (persisted locally); Bulk Actions bar exposes 3 operations:
// bulk add progress, bulk add to groups, bulk enroll/save profile fields.
import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Square, Users, Edit2, Trash2, X, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import toast from "react-hot-toast";

const PROGRESS_TYPES = ["UNIT_TEST", "MICRO_PROJECT", "END_SEM", "ASSIGNMENT"];

const EMPTY_FORM = { type: "UNIT_TEST", title: "", marksObtained: "", maxMarks: "", remark: "" };

// Shared bulk-result banner component.
function BulkResultBanner({ result, onDismiss }) {
  if (!result) return null;
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-green-800">{result.message}</p>
          {result.recorded && (
            <p className="mt-1 text-green-700">Recorded progress for {result.recorded.length} student(s).</p>
          )}
          {result.added && (
            <p className="mt-1 text-green-700">Enrolled {result.added.length} student(s) into group(s).</p>
          )}
          {result.updated && (
            <p className="mt-1 text-green-700">Updated {result.updated.length} student profile(s).</p>
          )}
          {result.failed && result.failed.length > 0 && (
            <p className="mt-2 text-amber-700">
              Skipped / failed: {result.failed.length} student(s) — some students may not be in your groups.
            </p>
          )}
          {result.already && result.already.length > 0 && (
            <p className="mt-2 text-amber-700">Already in group: {result.already.length} student(s).</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-green-600 hover:text-green-800"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}


export default function TeacherDashboard() {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";
  const [students, setStudents] = useState([]);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Single-progress modal state.
  const [modalStudent, setModalStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Bulk modal state.
  const [bulkMode, setBulkMode] = useState(null); // 'progress' | 'members' | 'profile'
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkForm, setBulkForm] = useState({});
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  // Confirm delete modal state.
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }

  // Edit progress modal state.
  const [editEntry, setEditEntry] = useState(null); // the progress entry being edited
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Student progress viewer state.
  const [viewStudent, setViewStudent] = useState(null);
  const [modalTab, setModalTab] = useState("ALL");
  const [studentEntries, setStudentEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    let studentsOk = false;
    let groupsOk = false;
    try {
      const studentsRes = await api.get("/students");
      const studentsData = studentsRes.data?.students ?? studentsRes.data ?? [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      studentsOk = true;
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load students.");
    }
    try {
      if (isTeacher) {
        const groupsRes = await api.get("/groups");
        const groupsData = groupsRes.data?.groups ?? groupsRes.data ?? [];
        const mapped = Array.isArray(groupsData)                ? groupsData.map((g) => ({ ...g, memberCount: g.memberCount ?? 0 }))
          : [];
        setTeacherGroups(mapped);
        groupsOk = true;
      }
    } catch {
      // Groups are a convenience for bulk actions; ignore load errors here.
    }
    if (studentsOk || groupsOk) setLoading(false);
  }, [isTeacher]);

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

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(students.map((s) => s.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkResult(null);
    setBulkMode(null);
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
      toast.success(`Progress recorded for ${modalStudent.user?.name ?? modalStudent.rollNumber}.`);
      setModalStudent(null);
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || "Failed to save progress.");
    } finally {
      setSubmitting(false);
    }
  }

  function startBulkProgress() {
    setBulkMode("progress");
    setBulkForm({ type: "UNIT_TEST", title: "", marksObtained: "", maxMarks: "", remark: "" });
    setBulkError("");
  }

  function startBulkMembers() {
    setBulkMode("members");
    setBulkForm({ groupIds: [] });
    setBulkError("");
  }

  function startBulkProfile() {
    setBulkMode("profile");
    setBulkForm({ rollNumber: "", yearOfAdmission: "", phone: "" });
    setBulkError("");
  }

  async function submitBulkProgress(e) {
    e.preventDefault();
    setBulkError("");
    const payload = {
      studentIds: Array.from(selectedIds),
      type: bulkForm.type,
      title: bulkForm.title.trim(),
      marksObtained: bulkForm.marksObtained === "" ? undefined : Number(bulkForm.marksObtained),
      maxMarks: bulkForm.maxMarks === "" ? undefined : Number(bulkForm.maxMarks),
      remark: bulkForm.remark.trim() || undefined,
    };
    if (!payload.title) {
      setBulkError("Title is required.");
      return;
    }
    setBulkLoading(true);
    try {
      const res = await api.post("/progress/bulk", payload);
      setBulkResult(res.data);
      setBulkMode(null);
      clearSelection();
    } catch (err) {
      setBulkError(err?.response?.data?.error?.message || "Could not record progress.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function submitBulkMembers(e) {
    e.preventDefault();
    setBulkError("");
    if (bulkForm.groupIds.length === 0) {
      setBulkError("Pick at least one group.");
      return;
    }
    setBulkLoading(true);
    try {
      const res = await api.post("/bulk/members", {
        studentIds: Array.from(selectedIds),
        groupIds: bulkForm.groupIds,
      });
      setBulkResult(res.data);
      setBulkMode(null);
      clearSelection();
    } catch (err) {
      setBulkError(err?.response?.data?.error?.message || "Could not enroll students.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function submitBulkProfile(e) {
    e.preventDefault();
    setBulkError("");
    const payload = {
      studentIds: Array.from(selectedIds),
      rollNumber: bulkForm.rollNumber.trim() || undefined,
      yearOfAdmission:
        bulkForm.yearOfAdmission.trim() !== ""
          ? Number(bulkForm.yearOfAdmission)
          : undefined,
      phone: bulkForm.phone === "" ? undefined : bulkForm.phone.trim(),
    };
    setBulkLoading(true);
    try {
      const res = await api.post("/bulk/student-profile", payload);
      setBulkResult(res.data);
      setBulkMode(null);
      clearSelection();
    } catch (err) {
      setBulkError(err?.response?.data?.error?.message || "Could not update profiles.");
    } finally {
      setBulkLoading(false);
    }
  }

  // ---- Progress viewing for a student ----
  async function viewStudentProgress(student) {
    setViewStudent(student);
    setStudentEntries([]);
    setEntriesLoading(true);
    try {
      const res = await api.get(`/progress/${student.id}`);
      setStudentEntries(res.data.entries || []);
    } catch {
      setStudentEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }

  // ---- Edit progress entry ----
  function openEditEntry(entry) {
    setEditEntry(entry);
    setEditForm({
      type: entry.type,
      title: entry.title,
      marksObtained: entry.marksObtained ?? "",
      maxMarks: entry.maxMarks ?? "",
      remark: entry.remark || "",
    });
    setEditError("");
  }

  async function submitEditEntry(e) {
    e.preventDefault();
    setEditError("");
    const payload = {
      type: editForm.type,
      title: editForm.title.trim(),
      marksObtained: editForm.marksObtained !== "" ? Number(editForm.marksObtained) : null,
      maxMarks: editForm.maxMarks !== "" ? Number(editForm.maxMarks) : null,
      remark: editForm.remark.trim() || "",
    };
    if (!payload.title) { setEditError("Title is required."); return; }
    setEditSubmitting(true);
    try {
      await api.put(`/progress/${editEntry.id}`, payload);
      toast.success("Progress entry updated.");
      setEditEntry(null);
      if (viewStudent) viewStudentProgress(viewStudent);
    } catch (err) {
      setEditError(err?.response?.data?.error?.message || "Failed to update.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // ---- Delete progress entry (via confirm modal) ----
  function confirmDeleteEntry(entry) {
    setConfirmModal({
      title: "Delete Progress Entry",
      message: `Are you sure you want to delete "${entry.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/progress/${entry.id}`);
          toast.success("Progress entry deleted.");
          if (viewStudent) viewStudentProgress(viewStudent);
        } catch (err) {
          setError(err?.response?.data?.error?.message || "Failed to delete entry.");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  }

  // ---- Delete student (via confirm modal) ----
  function confirmDeleteStudent(student) {
    setConfirmModal({
      title: "Remove Student",
      message: `Are you sure you want to remove "${student.user?.name || student.rollNumber}"? This will soft-delete their profile and all group memberships.`,
      onConfirm: async () => {
        try {
          await api.delete(`/students/${student.id}`);
          toast.success(`Student "${student.user?.name || student.rollNumber}" removed.`);
          fetchStudents();
        } catch (err) {
          setError(err?.response?.data?.error?.message || "Failed to remove student.");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  }


  return (
    <div className="rounded-3xl border border-white/60 bg-white/60 p-6 sm:p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome, {user?.name}. {students.length} active student{students.length === 1 ? "" : "s"} enrolled.
          </p>
        </div>
        <button
          onClick={fetchStudents}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
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

      {bulkResult && (
        <BulkResultBanner result={bulkResult} onDismiss={() => setBulkResult(null)} />
      )}

      {bulkError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {bulkError}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/60">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-4 py-3 w-10">
                <button
                  type="button"
                  onClick={selectAll}
                  className="w-full flex h-6 items-center justify-center"
                  aria-label="Toggle all"
                >
                  {selectedIds.size === students.length && students.length > 0
                    ? <CheckSquare className="h-4 w-4 text-indigo-600" />
                    : <Square className="h-4 w-4" />
                  }
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Roll No
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Year
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Phone
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-transparent">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Loading students…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No active students found.
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const selected = selectedIds.has(s.id);
                return (
                  <tr
                    key={s.id}
                    className={"hover:bg-slate-50 " + (selected ? "bg-indigo-50/40" : "")}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(s.id)}
                        className="rounded border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
                        aria-label={"Toggle selection for " + (s.user?.name || s.rollNumber)}
                      >
                        {selected ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {s.user?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.rollNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.user?.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.yearOfAdmission}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openModal(s)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                          Add Progress
                        </button>
                        <button
                          onClick={() => viewStudentProgress(s)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          title="View progress entries"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDeleteStudent(s)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove student"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk actions bar (only when selection > 0) */}
      {selectedIds.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
              <Users className="h-4 w-4" />
              {selectedIds.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={startBulkProgress}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Bulk add progress
            </button>
            <button
              onClick={startBulkMembers}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Bulk add to groups
            </button>
            <button
              onClick={startBulkProfile}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Bulk enroll / save profile
            </button>
          </div>
        </div>
      )}

      {/* ---------- Single progress modal ---------- */}
      {modalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
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
                <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                >
                  {PROGRESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. UT-1 Differential Equations"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="marksObtained" className="mb-1 block text-sm font-medium text-slate-700">
                    Marks obtained
                  </label>
                  <input
                    id="marksObtained"
                    type="number"
                    min="0"
                    value={form.marksObtained}
                    onChange={(e) => setForm({ ...form, marksObtained: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="maxMarks" className="mb-1 block text-sm font-medium text-slate-700">
                    Max marks
                  </label>
                  <input
                    id="maxMarks"
                    type="number"
                    min="0"
                    value={form.maxMarks}
                    onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="remark" className="mb-1 block text-sm font-medium text-slate-700">
                  Remark (optional)
                </label>
                <textarea
                  id="remark"
                  rows="2"
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
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

      {/* ---------- Bulk progress modal ---------- */}
      {bulkMode === "progress" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Bulk add progress — {selectedIds.size} student(s)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This records one progress entry for every selected student with the same title and marks.
            </p>

            {bulkError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {bulkError}
              </p>
            )}

            <form onSubmit={submitBulkProgress} className="mt-4 space-y-4">
              <div>
                <label htmlFor="bulkType" className="mb-1 block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  id="bulkType"
                  value={bulkForm.type}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                >
                  {PROGRESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bulkTitle" className="mb-1 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="bulkTitle"
                  type="text"
                  value={bulkForm.title}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bulkMarks" className="mb-1 block text-sm font-medium text-slate-700">
                    Marks obtained
                  </label>
                  <input
                    id="bulkMarks"
                    type="number"
                    min="0"
                    value={bulkForm.marksObtained}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, marksObtained: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="bulkMax" className="mb-1 block text-sm font-medium text-slate-700">
                    Max marks
                  </label>
                  <input
                    id="bulkMax"
                    type="number"
                    min="0"
                    value={bulkForm.maxMarks}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bulkRemark" className="mb-1 block text-sm font-medium text-slate-700">
                  Remark (optional)
                </label>
                <textarea
                  id="bulkRemark"
                  rows="2"
                  value={bulkForm.remark}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, remark: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkMode(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkLoading ? "Saving…" : "Save for all selected"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Bulk add-to-groups modal ---------- */}
      {bulkMode === "members" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Bulk add to groups — {selectedIds.size} student(s)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enroll the selected students into one or more of your groups. Already-in-group
              students are skipped, not failed.
            </p>

            {bulkError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {bulkError}
              </p>
            )}

            {isTeacher && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Target group(s)
                </label>
                <div className="space-y-2">
                  {teacherGroups?.map((g) => {
                    const picked =
                      bulkForm.groupIds.length === 0
                        ? true
                        : bulkForm.groupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                          picked
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={(e) => {
                            setBulkForm((prev) => {
                              const next = new Set(prev.groupIds);
                              if (e.target.checked) next.add(g.id);
                              else next.delete(g.id);
                              return { ...prev, groupIds: Array.from(next) };
                            });
                          }}
                          className="rounded"
                        />
                <span className="flex-1 text-slate-900">{g.name}</span>
                {g.memberCount !== undefined && (
                  <span className="text-xs text-slate-400">{g.memberCount} members</span>
                )}
              </label>
                    );
                  })}
                  {(!teacherGroups || teacherGroups.length === 0) && (
                    <p className="text-sm text-slate-500">You haven't created any groups yet.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkMode(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBulkMembers}
                disabled={bulkLoading || !bulkForm.groupIds.length}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkLoading ? "Enrolling…" : "Enroll selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Bulk profile modal ---------- */}
      {bulkMode === "profile" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Bulk enroll / save profile — {selectedIds.size} student(s)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Set the same roll number, admission year, and/or phone for all selected students.
              Leave any field blank to leave it unchanged for that student.
            </p>

            {bulkError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {bulkError}
              </p>
            )}

            <form onSubmit={submitBulkProfile} className="mt-4 space-y-4">
              <div>
                <label htmlFor="bulkRoll" className="mb-1 block text-sm font-medium text-slate-700">
                  Roll number (optional — leave blank to skip)
                </label>
                <input
                  id="bulkRoll"
                  type="text"
                  value={bulkForm.rollNumber}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, rollNumber: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="bulkYear" className="mb-1 block text-sm font-medium text-slate-700">
                  Admission year (optional — leave blank to skip)
                </label>
                <input
                  id="bulkYear"
                  type="number"
                  min="1990"
                  max="2100"
                  value={bulkForm.yearOfAdmission}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, yearOfAdmission: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="bulkPhone" className="mb-1 block text-sm font-medium text-slate-700">
                  Phone (optional — leave blank to skip)
                </label>
                <input
                  id="bulkPhone"
                  type="text"
                  value={bulkForm.phone}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkMode(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkLoading ? "Saving…" : "Update all selected"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Confirmation modal ---------- */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{confirmModal.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{confirmModal.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Student progress viewer ---------- */}
      {viewStudent && !editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Progress — {viewStudent.user?.name || viewStudent.rollNumber}
                </h2>
                <p className="text-sm text-slate-500">Roll No: {viewStudent.rollNumber}</p>
              </div>
              <button onClick={() => setViewStudent(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {entriesLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading entries…</p>
            ) : studentEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No progress entries recorded yet.</p>
            ) : (
              <>
                {/* Modal Tabs */}
            <div className="flex gap-2 border-b border-slate-200 mb-4 pb-2 mt-2 animate-fade-in-down">
              {["ALL", "UNIT_TEST", "ASSIGNMENT", "END_SEM", "MICRO_PROJECT"].map((t) => (
                <button
                  key={t}
                  onClick={() => setModalTab(t)}
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full transition-colors",
                    modalTab === t ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>

              <ul className="divide-y divide-slate-100">
                {studentEntries.filter(e => modalTab === "ALL" || e.type === modalTab).map((e, i) => (<li key={e.id} className="flex items-start justify-between gap-4 py-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          {(e.type || "ENTRY").replace("_", " ")}
                        </span>
                        <p className="truncate text-sm font-medium text-slate-800">{e.title}</p>
                      </div>
                      {e.marksObtained != null && e.maxMarks != null && (
                        <p className="mt-1 text-xs text-slate-600">
                          Score: {e.marksObtained}/{e.maxMarks} ({Math.round((e.marksObtained / e.maxMarks) * 100)}%)
                        </p>
                      )}
                      {e.remark && <p className="mt-1 text-xs text-slate-500">"{e.remark}"</p>}
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(e.recordedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEditEntry(e)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        title="Edit entry"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDeleteEntry(e)}
                        className="rounded-lg border border-red-200 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- Edit progress entry modal ---------- */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
            <h2 className="text-lg font-bold text-slate-900">Edit Progress Entry</h2>
            <p className="mt-1 text-sm text-slate-500">Editing: {editEntry.title}</p>

            {editError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {editError}
              </p>
            )}

            <form onSubmit={submitEditEntry} className="mt-4 space-y-4">
              <div>
                <label htmlFor="editType" className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select
                  id="editType"
                  value={editForm.type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                >
                  {PROGRESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="editTitle" className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  id="editTitle"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editMarks" className="mb-1 block text-sm font-medium text-slate-700">Marks Obtained</label>
                  <input
                    id="editMarks"
                    type="number"
                    step="0.01"
                    value={editForm.marksObtained}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, marksObtained: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="editMaxMarks" className="mb-1 block text-sm font-medium text-slate-700">Max Marks</label>
                  <input
                    id="editMaxMarks"
                    type="number"
                    step="0.01"
                    value={editForm.maxMarks}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="editRemark" className="mb-1 block text-sm font-medium text-slate-700">Remark</label>
                <textarea
                  id="editRemark"
                  rows={2}
                  value={editForm.remark}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, remark: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditEntry(null)}
                  disabled={editSubmitting}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
