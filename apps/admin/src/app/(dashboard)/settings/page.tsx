"use client";

import { useEffect, useState } from "react";
import { settingsApi } from "@/lib/api";
import { Settings as SettingsIcon, Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then((d) => { setForm(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setBusy(true); setSaved(false);
    try {
      const r = await settingsApi.update(form);
      setForm(r); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setBusy(false); }
  };

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={24} /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon size={24} className="text-[#C9A227]" /> Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">إعدادات المنصة العامة — SUPER_ADMIN فقط</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Brand Name</label>
            <input value={form.brandName ?? ""} onChange={(e) => set("brandName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Default Currency</label>
            <select value={form.defaultCurrency ?? "EGP"} onChange={(e) => set("defaultCurrency", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
              <option>EGP</option><option>USD</option><option>SAR</option><option>AED</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Tax %</label>
            <input type="number" step="0.1" value={((form.taxBps ?? 0) / 100).toFixed(1)}
              onChange={(e) => set("taxBps", Math.round(parseFloat(e.target.value || "0") * 100))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Support SLA (hours)</label>
            <input type="number" value={form.supportSlaHours ?? 24} onChange={(e) => set("supportSlaHours", parseInt(e.target.value || "24"))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">OTP TTL (minutes)</label>
            <input type="number" value={form.otpTtlMinutes ?? 10} onChange={(e) => set("otpTtlMinutes", parseInt(e.target.value || "10"))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Default Locale</label>
            <select value={form.locale ?? "ar-EG"} onChange={(e) => set("locale", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
              <option value="ar-EG">ar-EG</option><option value="en-US">en-US</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t">
          <button onClick={save} disabled={busy}
            className="px-5 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
