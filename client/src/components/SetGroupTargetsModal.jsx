import { useState, useEffect } from "react";
import { X, Target, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const PROGRESS_TYPES = ["UNIT_TEST", "MICRO_PROJECT", "END_SEM", "ASSIGNMENT"];

export default function SetGroupTargetsModal({ groupId, onClose }) {
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchTargets() {
      try {
        const res = await api.get(`/targets/${groupId}`);
        const data = res.data.targets || [];
        const map = {};
        data.forEach(t => { map[t.type] = t.totalTarget; });
        setTargets(map);
      } catch (err) {
        toast.error("Failed to load existing targets.");
      } finally {
        setLoading(false);
      }
    }
    fetchTargets();
  }, [groupId]);

  const handleChange = (type, val) => {
    setTargets(prev => ({ ...prev, [type]: parseInt(val, 10) || 0 }));
  };

  const handleSave = async (type) => {
    setSaving(true);
    try {
      await api.post(`/targets/${groupId}`, {
        type,
        totalTarget: targets[type] || 0
      });
      toast.success(`${type.replace("_", " ")} target saved.`);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to save target.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <Target className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Set Group Targets</h2>
              <p className="text-sm text-slate-500">Define the 12/20 required tasks</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {PROGRESS_TYPES.map(type => (
              <div key={type} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{type.replace("_", " ")}</p>
                  <p className="text-xs text-slate-500">Target count</p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={targets[type] || ""}
                  onChange={(e) => handleChange(type, e.target.value)}
                  className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-center focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="0"
                />
                <button
                  onClick={() => handleSave(type)}
                  disabled={saving}
                  className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700 hover:bg-indigo-200 transition-colors disabled:opacity-50"
                  title="Save"
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
