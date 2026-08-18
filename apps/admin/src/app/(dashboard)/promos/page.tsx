"use client";

import { useEffect, useState } from "react";
import { promosApi, type PromoCode } from "@/lib/api";
import { TicketPercent, Plus, Loader2, X, Save, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import clsx from "clsx";

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ code: "", kind: "PERCENT", value: 10, maxUses: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => { setLoading(true); try { setPromos(await promosApi.list()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await promosApi.create({
        code: form.code, kind: form.kind,
        valueBps: form.kind === "PERCENT" ? Math.round(form.value * 100) : 0,
        amountMinor: form.kind === "FIXED" ? Math.round(form.value * 100) : 0,
        maxUses: form.maxUses,
      });
      setModal(false); setForm({ code: "", kind: "PERCENT", value: 10, maxUses: 0 });
      await load();
    } catch (e: any) { setError(e?.response?.data?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const toggle = async (p: PromoCode) => { await promosApi.update(p.id, { active: !p.active }); await load(); };
  const del = async (p: PromoCode) => { if (confirm(`Deactivate ${p.code}?`)) { await promosApi.delete(p.id); await load(); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TicketPercent size={24} className="text-[#C9A227]" /> Promo Codes
          </h1>
          <p className="text-sm text-gray-600 mt-1">{promos.filter((p) => p.active).length} active codes</p>
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold flex items-center gap-2">
          <Plus size={18} /> New Code
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        ) : promos.length === 0 ? (
          <div className="p-12 text-center text-gray-600"><TicketPercent size={40} className="mx-auto mb-3 text-gray-300" />No promo codes yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-left text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Usage</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promos.map((p) => (
                <tr key={p.id} className={clsx("hover:bg-gray-50/50", !p.active && "opacity-50")}>
                  <td className="px-4 py-3"><code className="px-2 py-1 bg-[#C9A227]/10 text-[#8C6D1F] rounded font-bold">{p.code}</code></td>
                  <td className="px-4 py-3 font-medium">{p.kind === "PERCENT" ? `${(p.valueBps / 100).toFixed(0)}%` : `EGP ${(p.amountMinor / 100).toFixed(0)}`}</td>
                  <td className="px-4 py-3 text-gray-600">{p.usedCount}{p.maxUses > 0 ? ` / ${p.maxUses}` : " / ∞"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold", p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                      {p.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => toggle(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Toggle">
                        {p.active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                      </button>
                      <button onClick={() => del(p)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#C9A227]/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">New Promo Code</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required
                  placeholder="SUMMER26" dir="ltr"
                  className="w-full px-3 py-2 border rounded-lg font-mono tracking-widest focus:outline-none focus:border-[#C9A227]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Type</label>
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option value="PERCENT">%</option><option value="FIXED">EGP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">{form.kind === "PERCENT" ? "%" : "Amount"}</label>
                  <input type="number" step="0.1" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value || "0") })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#C9A227]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Max Uses</label>
                  <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: parseInt(e.target.value || "0") })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#C9A227]" />
                </div>
              </div>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <button type="submit" disabled={busy || !form.code.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
