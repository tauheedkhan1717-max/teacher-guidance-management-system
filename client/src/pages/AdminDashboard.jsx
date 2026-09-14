// Admin Dashboard — System Administrator can generate invite codes and view all existing invites.
// Reads GET /api/admin/invites and creates via POST /api/admin/invites (ADMIN role only on the backend).
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

// Safe date formatter — never throws on null/invalid values.
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

// Badge helper — used / unused + who claimed it.
// NOTE: the API returns usedBy/createdBy as objects ({ name }), never render them raw.
function statusBadge(invite) {
  if (invite?.isUsed) {
    const claimedBy =
      typeof invite.usedBy === "string" ? invite.usedBy : invite.usedBy?.name;
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {claimedBy ? `Used — ${claimedBy}` : "Used"}
      </span>
    );
  }
  const expiry = invite?.expiresAt ? new Date(invite.expiresAt) : null;
  if (expiry && !Number.isNaN(expiry.getTime()) && expiry < new Date()) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
      Unused
    </span>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState("");
  const [generating, setGenerating] = useState(false);

  // Fetch all invites on mount.
  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/invites");
      // Tolerate { invites: [...] }, a bare array, { data: { invites } } or garbage —
      // the state ALWAYS ends up as an array.
      const data = res.data?.invites ?? res.data?.data?.invites ?? res.data ?? [];
      setInvites(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load invite codes.");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // Generate a new invite.
  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    try {
      await api.post("/admin/invites", { department: department.trim() });
      setDepartment("");
      await fetchInvites(); // refresh the table
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to generate invite code.");
        } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome, {user?.name || "Administrator"}. Generate and manage teacher invite codes.
            </p>
          </div>
        </div>

        {/* Generate form */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Generate New Invite Code</h2>
          <form onSubmit={handleGenerate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="department" className="mb-1 block text-sm font-medium text-slate-700">
                Department (optional)
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Electronics Engineering"
                disabled={generating}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={generating}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "Generating…" : "Generate Invite"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Invite list */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Invite Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading invite codes…
                  </td>
                </tr>
              ) : !Array.isArray(invites) || invites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No invite codes generated yet.
                  </td>
                </tr>
              ) : (
                invites.map((invite) => (
                  <tr key={invite?.id ?? invite?.code ?? Math.random()} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900">{invite?.code ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{invite?.department || "—"}</td>
                    <td className="px-6 py-4 text-sm">{statusBadge(invite)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(invite?.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(invite?.expiresAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
