import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import toast from "react-hot-toast";
import { User, Phone, Mail } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.studentProfile?.phone || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (user?.role !== "STUDENT") {
      toast.error("Only students can update profile details here.");
      return;
    }
    setLoading(true);
    try {
      await api.patch("/api/students/me", { phone });
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Personal Details
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          View and edit your personal information.
        </p>
      </div>

      <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
              <Mail className="h-4 w-4" /> {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input type="text" value={user?.name || ""} disabled className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input type="text" value={user?.email || ""} disabled className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={user?.role !== "STUDENT"}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 pl-10 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {user?.role === "STUDENT" && (
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
