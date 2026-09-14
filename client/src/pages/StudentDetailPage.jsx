// Phase 9 — Teacher: full student record.
// Profile + summary + full progress timeline, with add/edit/soft-delete forms.
// Teachers can also respond to this student's guidance requests (assigned subjects only — server-enforced).
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, BookOpen, ClipboardList, Download, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import api from "../api/axios.js";
import { cn } from "../lib/utils.js";
import { downloadReport } from "../lib/download.js";

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";

const TYPE_STYLES = {
  PROJECT: "bg-violet-100 text-violet-700",
  ASSIGNMENT: "bg-sky-100 text-sky-700",
  NOTE: "bg-amber-100 text-amber-700",
  EXAM: "bg-emerald-100 text-emerald-700",
};

const STATUS_STYLE = {
  PENDING: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

const EMPTY_FORM = { subjectId: "", type: "EXAM", title: "", status: "", marksObtained: "", maxMarks: "", remark: "", recordedAt: "" };

export default function StudentDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [mySubjects, setMySubjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [responding, setResponding] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, subjRes, reqRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get("/subjects/mine"),
        api.get("/requests"),
      ]);
      setStudent(sRes.data.student);
      setMySubjects(subjRes.data.subjects || []);
      setRequests((reqRes.data.requests || []).filter((r) => r.student.id === id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load student record.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadReport(`/reports/${id}/pdf`, `report_${student.rollNumber || "student"}.pdf`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not generate the report.");
    } finally {
      setDownloading(false);
    }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, subjectId: mySubjects[0]?.id || "", recordedAt: new Date().toISOString().slice(0, 10) });
    setFieldErrors({});
    setSubmitError("");
    setAddOpen(true);
  }

  function openEdit(entry) {
    setEditing(entry);
    setForm({
      subjectId: entry.subject?.id || entry.subjectId || "",
      type: entry.type,
      title: entry.title,
      status: entry.status || "",
      marksObtained: entry.marksObtained ?? "",
      maxMarks: entry.maxMarks ?? "",
      remark: entry.remark || "",
      recordedAt: entry.recordedAt ? entry.recordedAt.slice(0, 10) : "",
    });
    setFieldErrors({});
    setSubmitError("");
    setAddOpen(true);
  }

  function closeModal() {
    setAddOpen(false);
    setEditing(null);
  }

  function validate() {
    const errs = {};
    if (!form.subjectId) errs.subjectId = "Select a subject.";
    if (!form.type) errs.type = "Select a type.";
    if (!form.title.trim()) errs.title = "Title is required.";
    if (form.marksObtained !== "" && form.maxMarks !== "" && Number(form.marksObtained) > Number(form.maxMarks)) {
      errs.marksObtained = "Marks cannot exceed max marks.";
    }
    return errs;
  }
  async function submitEntry(e) {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setSubmitError("");
    const payload = {
      subjectId: form.subjectId,
      type: form.type,
      title: form.title.trim(),
      status: form.status || undefined,
      marksObtained: form.marksObtained === "" ? undefined : Number(form.marksObtained),
      maxMarks: form.maxMarks === "" ? undefined : Number(form.maxMarks),
      remark: form.remark.trim() || undefined,
      recordedAt: form.recordedAt ? new Date(form.recordedAt).toISOString() : undefined,
    };
    try {
      if (editing) await api.patch(`/progress/${editing.id}`, payload);
      else await api.post("/progress", { ...payload, studentId: student.id });
      closeModal();
      await load();
    } catch (err) {
      setSubmitError(err?.response?.data?.error?.message || "Could not save the entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function softDelete(entry) {
    if (!window.confirm(`Soft-delete "${entry.title}"? It stays in the audit log.`)) return;
    try {
      await api.delete(`/progress/${entry.id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not delete the entry.");
    }
  }

  function openRespond(req) {
    setResponding(req);
    setForm({ ...EMPTY_FORM, status: req.status === "PENDING" ? "SCHEDULED" : req.status });
    setSubmitError("");
  }

  async function submitRespond(e) {
    e.preventDefault();
    if (!form.status) {
      setSubmitError("Choose a status: SCHEDULED or COMPLETED.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.patch(`/requests/${responding.id}/respond`, {
        status: form.status,
        teacherReply: form.remark.trim() || undefined,
      });
      setResponding(null);
      await load();
    } catch (err) {
      setSubmitError(err?.response?.data?.error?.message || "Could not update the request.");
    } finally {
      setSubmitting(false);
    }
  }

  const entries = student?.progressEntries || [];
  const exams = entries.filter((e) => e.type === "EXAM" && e.marksObtained != null && e.maxMarks);
  const examsAvg = exams.length
    ? Math.round((exams.reduce((s, e) => s + (e.marksObtained / e.maxMarks) * 100, 0) / exams.length))
    : null;
  const assignments = entries.filter((e) => e.type === "ASSIGNMENT");
  const assignmentsDone = assignments.filter((e) => e.status === "SUBMITTED" || e.status === "EVALUATED").length;
  const projects = entries.filter((e) => e.type === "PROJECT");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700">{error}</p>
        <button onClick={load} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Retry</button>
      </div>
    );
  }
  if (!student) return null;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-sm">
        <Link to="/students" className="inline-flex items-center gap-1 text-sm text-indigo-100 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{student.user.name}</h1>
            <p className="mt-1 text-sm text-indigo-100">
              Roll {student.rollNumber} · {student.class.name} — Section {student.class.section} · Batch {student.batch}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openAdd}
              disabled={mySubjects.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Add progress
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Preparing…" : "Download report"}
            </button>
          </div>
        </div>
      </section>
      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Award} label="Exam average" value={examsAvg !== null ? examsAvg + "%" : "—"} sub={exams.length + " exam" + (exams.length === 1 ? "" : "s")} />
        <SummaryCard icon={ClipboardList} label="Assignments" value={assignmentsDone + "/" + assignments.length} sub={assignments.filter((a) => a.status === "PENDING").length + " pending"} />
        <SummaryCard icon={FileText} label="Projects" value={projects.length} sub={projects.filter((p) => p.status === "PENDING" || p.status === "SUBMITTED").length + " active"} />
        <SummaryCard icon={BookOpen} label="Total entries" value={entries.length} sub={student.subjects?.length + " subjects"} />
      </section>

      {/* Timeline */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Academic history</h2>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No progress entries recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TYPE_STYLES[e.type] || "bg-slate-100 text-slate-600")}>{e.type}</span>
                    <p className="truncate text-sm font-medium text-slate-800">{e.title}</p>
                    {e.status && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{e.status}</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {e.subject?.name ?? e.subjectId} · {e.teacher?.user?.name} · {fmtDate(e.recordedAt)}
                    {e.marksObtained != null && e.maxMarks != null ? ` · ${e.marksObtained}/${e.maxMarks}` : ""}
                  </p>
                  {e.remark && <p className="mt-1 text-xs italic text-slate-500">"{e.remark}"</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(e)}
                    className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                    title="Edit entry"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => softDelete(e)}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    title="Soft-delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {/* Guidance requests for this student */}
      {requests.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Guidance requests</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[r.status] || "bg-slate-100 text-slate-600")}>{r.status}</span>
                    <p className="truncate text-sm font-medium text-slate-800">{r.topic}</p>
                    <span className="text-xs text-slate-500">{r.subject.name} · {fmtDate(r.createdAt)}</span>
                  </div>
                  {r.details && <p className="mt-1 text-xs text-slate-500">{r.details}</p>}
                  {r.teacherReply && (
                    <p className="mt-1 text-xs italic text-slate-500">Reply: "{r.teacherReply}" — {r.teacher?.user?.name}</p>
                  )}
                </div>
                {r.status !== "COMPLETED" && (
                  <button
                    onClick={() => openRespond(r)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Respond
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Add / Edit progress entry modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !submitting && closeModal()}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editing ? "Edit progress entry" : "Add progress entry"}</h3>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {submitError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

            <form onSubmit={submitEntry} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                  <select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} className={inputClass}>
                    {mySubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {fieldErrors.subjectId && <p className="mt-1 text-xs text-red-600">{fieldErrors.subjectId}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}>
                    {["EXAM", "ASSIGNMENT", "PROJECT", "NOTE"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="e.g. Mid-Term Examination" />
                {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Marks</label>
                  <input type="number" min="0" value={form.marksObtained} onChange={(e) => setForm((f) => ({ ...f, marksObtained: e.target.value }))} className={inputClass} placeholder="42" />
                  {fieldErrors.marksObtained && <p className="mt-1 text-xs text-red-600">{fieldErrors.marksObtained}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Max marks</label>
                  <input type="number" min="0" value={form.maxMarks} onChange={(e) => setForm((f) => ({ ...f, maxMarks: e.target.value }))} className={inputClass} placeholder="50" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                    <option value="">— none —</option>
                    {["PENDING", "SUBMITTED", "EVALUATED", "COMPLETED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Remark</label>
                <textarea value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} className={inputClass} rows={2} placeholder="Short teacher remark…" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Recorded date</label>
                <input type="date" value={form.recordedAt} onChange={(e) => setForm((f) => ({ ...f, recordedAt: e.target.value }))} className={inputClass} />
              </div>

              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Saving…" : editing ? "Save changes" : "Add entry"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Respond to guidance request modal */}
      {responding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !submitting && setResponding(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Respond to request</h3>
              <button onClick={() => setResponding(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-2 text-sm text-slate-500">{responding.topic} — {responding.subject.name}</p>
            {responding.details && <p className="mt-1 text-sm text-slate-400">{responding.details}</p>}

            {submitError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

            <form onSubmit={submitRespond} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                  <option value="">— choose —</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reply to student</label>
                <textarea value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} className={inputClass} rows={3} placeholder="e.g. Come to the lab at 2 PM tomorrow." />
              </div>
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Saving…" : "Send reply"}
              </button>
            </form>
          </div>
        </div>
      )}
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