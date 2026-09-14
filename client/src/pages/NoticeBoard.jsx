// Notice Board — read for every role; post/delete for TEACHER/ADMIN (server-gated).
// Follows the house defensive recipe: unwrap with ?? fallback, Array.isArray before .map,
// explicit loading/empty/error states — never white-screens on a malformed response.
import { useCallback, useEffect, useState } from "react";
import { Megaphone, RefreshCw, Trash2 } from "lucide-react";
import api from "../api/axios.js";
import { cn } from "../lib/utils.js";
import { useAuth } from "../context/AuthContext.jsx";

// Safe date formatter — never throws on null/invalid values.
function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function NoticeBoard() {
  const { user } = useAuth();
  const isWriter = user?.role === "TEACHER" || user?.role === "ADMIN";

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Post form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/notices");
      // Tolerate { notices: [...] }, a bare array, or garbage — always end up with an array.
      const data = res.data?.notices ?? res.data?.data?.notices ?? res.data ?? [];
      setNotices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load notices. Please try again.");
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePost(e) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (title.trim().length < 3) {
      setFormError("Title must be at least 3 characters.");
      return;
    }
    if (content.trim().length < 1) {
      setFormError("Content cannot be empty.");
      return;
    }
    setPosting(true);
    try {
      await api.post("/notices", { title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
      setSuccess("Notice posted.");
      await load();
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || "Could not post the notice. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id) {
    setFormError("");
    setSuccess("");
    setDeletingId(id);
    try {
      await api.delete(`/notices/${id}`);
      setSuccess("Notice removed.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not remove the notice. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const list = Array.isArray(notices) ? notices : [];

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Megaphone className="h-6 w-6" /> Notice Board
            </h1>
            <p className="mt-1 text-sm text-indigo-100">
              Announcements from teachers and administrators.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </section>

      {/* ---------- Banners ---------- */}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ---------- Post form (TEACHER/ADMIN only — server enforces it too) ---------- */}
      {isWriter && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Post a notice</h2>
          <form onSubmit={handlePost} className="mt-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Unit test schedule announced)"
              maxLength={150}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the announcement…"
              rows={4}
              maxLength={5000}
              className="w-full resize-y rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={posting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {posting ? "Posting…" : "Post notice"}
            </button>
          </form>
        </section>
      )}

      {/* ---------- Notice list ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">All notices</h2>
        {loading ? (
          <div className="mt-6 flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
        ) : list.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {list.map((n) => {
              const canDelete = user?.role === "ADMIN" || n?.author?.id === user?.id;
              return (
                <li key={n?.id ?? Math.random()} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{n?.title || "Untitled"}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{n?.content}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {n?.author?.name || "Unknown"} · {fmtDate(n?.createdAt)}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(n.id)}
                        disabled={deletingId === n.id}
                        className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label="Delete notice"
                        title="Delete notice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No notices yet — nothing has been posted.</p>
        )}
      </section>
    </div>
  );
}
