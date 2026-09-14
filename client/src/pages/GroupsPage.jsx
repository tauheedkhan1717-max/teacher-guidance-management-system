// Groups — the teacher write-scope primitive. A teacher can only log progress for
// students in one of THEIR groups (enforced server-side by requireGroupAccess).
// Create/delete groups, manage members. Read-only across all groups for ADMIN.
// Defensive recipe throughout: ?? unwrap, Array.isArray, explicit loading/empty/error.
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Layers, RefreshCw, Trash2, UserPlus, Users, X } from "lucide-react";
import api from "../api/axios.js";
import { cn } from "../lib/utils.js";
import { useAuth } from "../context/AuthContext.jsx";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function GroupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  // Expanded group + its members
  const [expandedId, setExpandedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  // Add / remove member
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null); // group being deleted or member being removed

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/groups");
      const data = res.data?.groups ?? res.data?.data?.groups ?? res.data ?? [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load groups. Please try again.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.get("/students");
      const data = res.data?.students ?? res.data?.data?.students ?? res.data ?? [];
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]); // directory is a convenience; member add still works by id server-side
    }
  }, []);

  useEffect(() => {
    load();
    loadStudents();
  }, [load, loadStudents]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (name.trim().length < 2) {
      setFormError("Group name must be at least 2 characters.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/groups", { name: name.trim() });
      setName("");
      setSuccess("Group created.");
      await load();
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || "Could not create the group. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(groupId) {
    setFormError("");
    setSuccess("");
    setBusyId(groupId);
    try {
      await api.delete(`/groups/${groupId}`);
      if (expandedId === groupId) setExpandedId(null);
      setSuccess("Group removed.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not remove the group. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function openMembers(group) {
    if (expandedId === group.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(group.id);
    setMembers([]);
    setMembersError("");
    setSelectedStudentId("");
    setMembersLoading(true);
    try {
      const res = await api.get(`/groups/${group.id}/members`);
      const data = res.data?.members ?? res.data ?? [];
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setMembersError(err?.response?.data?.error?.message || "Could not load members.");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  async function reloadMembers(groupId) {
    const res = await api.get(`/groups/${groupId}/members`);
    const data = res.data?.members ?? res.data ?? [];
    setMembers(Array.isArray(data) ? data : []);
    await load();
  }

  async function handleAddMember(groupId) {
    setFormError("");
    setSuccess("");
    if (!selectedStudentId) {
      setFormError("Pick a student to add.");
      return;
    }
    setAdding(true);
    try {
      await api.post(`/groups/${groupId}/members`, { studentId: selectedStudentId });
      setSelectedStudentId("");
      setSuccess("Student added to the group.");
      await reloadMembers(groupId);
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || "Could not add the student. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(groupId, membershipId) {
    setFormError("");
    setSuccess("");
    setBusyId(membershipId);
    try {
      await api.delete(`/groups/${groupId}/members/${membershipId}`);
      setSuccess("Student removed from the group.");
      await reloadMembers(groupId);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not remove the student. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const memberIds = new Set(members.map((m) => m?.student?.id).filter(Boolean));
  const addableStudents = students.filter((s) => s?.id && !memberIds.has(s.id));

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Layers className="h-6 w-6" /> Groups
            </h1>
            <p className="mt-1 text-sm text-indigo-100">
              {isAdmin
                ? "All teachers' groups — you can manage any of them."
                : "You can record progress only for students in your groups."}
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
      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}

      {/* ---------- Create form ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create a group</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name (e.g. FY-CSE Batch A)"
            maxLength={100}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create group"}
          </button>
        </form>
      </section>

      {/* ---------- Group cards ---------- */}
      <section className="space-y-3">
        {loading ? (
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">
              No groups yet — create one above to define who you can record progress for.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g?.id ?? Math.random()} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 p-5">
                <button onClick={() => openMembers(g)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {expandedId === g?.id ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{g?.name || "Untitled group"}</p>
                    <p className="text-xs text-slate-400">Created {fmtDate(g?.createdAt)}</p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {g?.memberCount ?? 0} member{(g?.memberCount ?? 0) === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={busyId === g?.id}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label="Delete group"
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ---------- Expanded: members ---------- */}
              {expandedId === g?.id && (
                <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                  {membersLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-600" />
                    </div>
                  ) : membersError ? (
                    <p className="text-sm text-red-600">{membersError}</p>
                  ) : (
                    <>
                      {members.length > 0 ? (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                          {members.map((m) => (
                            <li key={m?.membershipId ?? Math.random()} className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">
                                  {m?.student?.user?.name || "—"}{" "}
                                  <span className="text-xs text-slate-400">· Roll {m?.student?.rollNumber || "—"}</span>
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {m?.student?.user?.email || "—"} · added {fmtDate(m?.addedAt)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(g.id, m.membershipId)}
                                disabled={busyId === m?.membershipId}
                                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                aria-label="Remove from group"
                                title="Remove from group"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400">No members yet — add a student below.</p>
                      )}

                      {/* Add member */}
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">Pick a student to add…</option>
                          {addableStudents.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.user?.name || "—"} (Roll {s.rollNumber})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddMember(g.id)}
                          disabled={adding || !selectedStudentId}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          <UserPlus className="h-4 w-4" /> {adding ? "Adding…" : "Add member"}
                        </button>
                      </div>
                      {students.length === 0 && (
                        <p className="mt-2 text-xs text-slate-400">
                          No students in the directory yet — students appear here after they register.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
