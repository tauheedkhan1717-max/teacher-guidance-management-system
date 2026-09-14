// A2 — students may edit ONLY their own phone/address (server + Zod enforced).
import { useState } from "react";
import { Pencil, Save } from "lucide-react";
import api from "../api/axios.js";

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";

export default function ContactEditor({ initialPhone, initialAddress }) {
  const [phone, setPhone] = useState(initialPhone || "");
  const [address, setAddress] = useState(initialAddress || "");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.patch("/students/me", {
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      setMessage({ type: "success", text: "Contact details updated." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.error?.message || "Could not update." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Contact details</h2>
          <p className="text-sm text-slate-500">You may update your phone and address only — academic fields are locked.</p>
        </div>
        <Pencil className="h-5 w-5 text-indigo-500" />
      </div>

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

      <form onSubmit={handleSave} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contact-phone">Phone</label>
          <input id="contact-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="98765 01234" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contact-address">Address</label>
          <input id="contact-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="Aurangabad" />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save contact"}
          </button>
        </div>
      </form>
    </section>
  );
}