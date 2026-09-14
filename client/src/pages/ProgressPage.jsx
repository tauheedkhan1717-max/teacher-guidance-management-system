// Phase 9 — Teacher: standalone "Add progress" form.
// Student picker + assigned-subjects dropdown + entry type/marks/remark.
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import api from "../api/axios.js";

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";

const EMPTY = {
  studentId: "",
  subjectId: "",
  type: "EXAM",
  title: "",
  status: "",
  marksObtained: "",
  maxMarks: "",
  remark: "",
  recordedAt: "",
};

export default function ProgressPage() {
  const [students, setStudents] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [fields, setFields] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/students"), api.get("/subjects/mine")])
      .then(([sRes, subjRes]) => {
        setStudents(sRes.data.students || []);
        setMySubjects(subjRes.data.subjects || []);
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: "error", text: "Could not load students/subjects. Is the API running?" });
        setLoading(false);
      });
  }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.studentId) errs.studentId = "Select a student.";
    if (!form.subjectId) errs.subjectId = "Select a subject.";
    if (!form.title.trim()) errs.title = "Title is required.";
    if (form.marksObtained !== "" && form.maxMarks !== "" && Number(form.marksObtained) > Number(form.maxMarks)) {
      errs.marksObtained = "Marks cannot exceed max marks.";
    }
    setFields(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      await api.post("/progress", {
        studentId: form.studentId,
        subjectId: form.subjectId,
        type: form.type,
        title: form.title.trim(),
        status: form.status || undefined,
        marksObtained: form.marksObtained === "" ? undefined : Number(form.marksObtained),
        maxMarks: form.maxMarks === "" ? undefined : Number(form.maxMarks),
        remark: form.remark.trim() || undefined,
        recordedAt: form.recordedAt ? new Date(form.recordedAt).toISOString() : undefined,
      });
      setMessage({ type: "success", text: "Progress entry recorded." });
      setForm(EMPTY);
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.error?.message || "Could not save the entry." });
    } finally {
      setSubmitting(false);
    }
  }

  const err = (key) => (fields[key] ? <p className="mt-1 text-xs text-red-600">{fields[key]}</p> : null);

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900">Add progress</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Record a project, assignment, note or exam mark. Subject dropdown shows only subjects assigned to you.
      </p>

      {message.text && (
        <p
          className={
            "mt-4 rounded-lg border px-3 py-2 text-sm " +
            (message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700")
          }
        >
          {message.text}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-student">Student</label>
            <select id="p-student" value={form.studentId} onChange={(e) => set("studentId", e.target.value)} className={inputClass}>
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.rollNumber} — {s.user.name} ({s.class.name} {s.class.section})</option>
              ))}
            </select>
            {err("studentId")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-subject">Subject</label>
            <select id="p-subject" value={form.subjectId} onChange={(e) => set("subjectId", e.target.value)} className={inputClass}>
              <option value="">Select subject…</option>
              {mySubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            {err("subjectId")}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-type">Type</label>
            <select id="p-type" value={form.type} onChange={(e) => set("type", e.target.value)} className={inputClass}>
              {["EXAM", "ASSIGNMENT", "PROJECT", "NOTE"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-title">Title</label>
            <input id="p-title" type="text" value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="e.g. Unit Test 2" />
            {err("title")}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-marks">Marks</label>
            <input id="p-marks" type="number" min="0" value={form.marksObtained} onChange={(e) => set("marksObtained", e.target.value)} className={inputClass} placeholder="42" />
            {err("marksObtained")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-max">Max marks</label>
            <input id="p-max" type="number" min="0" value={form.maxMarks} onChange={(e) => set("maxMarks", e.target.value)} className={inputClass} placeholder="50" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-status">Status</label>
            <select id="p-status" value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
              <option value="">— none —</option>
              {["PENDING", "SUBMITTED", "EVALUATED", "COMPLETED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-remark">Remark</label>
          <textarea id="p-remark" value={form.remark} onChange={(e) => set("remark", e.target.value)} className={inputClass} rows={2} placeholder="Short remark…" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="p-date">Recorded date</label>
          <input id="p-date" type="date" value={form.recordedAt} onChange={(e) => set("recordedAt", e.target.value)} className={inputClass} />
        </div>

        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Saving…" : "Add entry"}
        </button>
      </form>
    </div>
  );
}