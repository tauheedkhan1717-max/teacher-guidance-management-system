import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/axios.js";
import { Target } from "lucide-react";

export default function AnalyticsCard({ studentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get(`/analytics/${studentId}`);
        setData(res.data.analytics);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [studentId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { byType } = data;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl mb-6">
      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Target className="h-5 w-5 text-indigo-500" /> Performance Analytics
      </h3>
      
      {byType && Object.keys(byType).length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">Required Targets (12/20)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(byType).map(([type, stats]) => {
              const { completed, target } = stats;
              const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 100;
              const radius = 30;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (pct / 100) * circumference;

              return (
                <div key={type} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                      <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`transition-all duration-1000 ${pct >= 100 ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-slate-800">{completed}</span>
                      <span className="text-[10px] text-slate-500">/ {target}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-600 text-center">{type.replace("_", " ")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-4">Scores over time</h4>
        <div className="h-64 w-full">
          {data.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="title" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-slate-400 text-sm italic">Not enough data to display chart.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
