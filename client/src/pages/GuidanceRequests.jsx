// Guidance Requests — the v1 EXTENSION UI.
// Student-facing: list own requests + modal to create one (Subject, Topic, Details).
// Permission-aware: the backend enforces student-only creation and teacher-only responses.
import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Plus, X } from "lucide-react";
import api from "../api/axios.js";
import { cn } from "../lib/utils.js";

const STATUS_STYLE = {
  PENDING: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function GuidanceRequests({ subjects }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ subjectId: "", topic: "", details: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/requests/mine");
      setRequests(res.data.requests || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load guidance requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openModal() {
    setForm({ subjectId: subjects[0]?.id || "", topic: "", details: "" });
    setFieldErrors({});
    setSubmitError("");
    setModalOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const errs = {};
    if (!form.subjectId) errs.subjectId = "Select a subject.";
    if (!form.topic.trim()) errs.topic = "Topic is required.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post("/requests", {
        subjectId: form.subjectId,
        topic: form.topic.trim(),
        details: form.details.trim() || undefined,
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      setSubmitError(err?.response?.data?.error?.message || "Could not create the request.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Guidance requests</h2>
          <p className="text-sm text-slate-500">Ask your teachers for guidance on a subject.</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New request
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : requests.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          No guidance requests yet — click "New request" to ask for help..
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {requests.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  <p className="text-sm font-medium text-slate-800">{r.topic}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[r.status] || "bg-slate-100 text-slate-600")}>
                  {r.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {r.subject.name} ({r.subject.code}) · asked {fmtDateTime(r.createdAt)}
              </p>
              {r.details && <p className="mt-1 text-xs text-slate-500">{r.details}</p>}
              {r.teacherReply && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Teacher reply ({r.teacher?.user?.name ?? "your teacher"}): "{r.teacherReply}"
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* ---------- Create modal ---------- */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">New guidance request</h3>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="req-subject">Subject</label>
                <select
                  id="req-subject"
                  value={form.subjectId}
                  onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                  className={inputClass}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
                {fieldErrors.subjectId && <p className="mt-1 text-xs text-red-600">{fieldErrors.subjectId}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="req-topic">Topic</label>
                <input
                  id="req-topic"
                  type="text"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Linked lists — need help with pointers"
                />
                {fieldErrors.topic && <p className="mt-1 text-xs text-red-600">{fieldErrors.topic}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="req-details">Details (optional)</label>
                <textarea
                  id="req-details"
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                  className={inputClass}
                  rows={3}
                  placeholder="What exactly do you need help with?"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}