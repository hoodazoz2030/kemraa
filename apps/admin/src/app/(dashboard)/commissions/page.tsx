"use client";
import { useEffect, useState } from "react";
import { financeAdminApi } from "@/lib/api";
import { DollarSign, Loader2, Plus, X, Save, Trash2 } from "lucide-react";
import clsx from "clsx";

const SCOPES = ["GLOBAL", "PARTNER", "SERVICE", "AGENCY"];
const BASES = ["NET", "GROSS", "FIXED"];

export default function CommissionsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ scopeType: "", active: "" });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ scopeType: "GLOBAL", basis: "NET", rateBps: 1000, fixedMinor: 0, currency: "EGP" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await financeAdminApi.listRules(filter); setRules(r.items); setTotal(r.total); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter.scopeType, filter.active]);

  const openCreate = () => {
    setEditing(null);
    setForm({ scopeType: "GLOBAL", basis: "NET", rateBps: 1000, fixedMinor: 0, currency: "EGP" });
    setModal(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ scopeType: r.scopeType, basis: r.basis, rateBps: r.rateBps, fixedMinor: r.fixedMinor, currency: r.currency });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await financeAdminApi.updateRule(editing.id, form);
      else await financeAdminApi.createRule(form);
      setModal(false); await load();
    } catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    try { await financeAdminApi.deleteRule(id); await load(); }
    catch (e: any) { alert(e?.response?.data?.message || e?.message); }
  };

  const isActive = (r: any) => {
    const now = Date.now();
    const from = new Date(r.activeFrom).getTime();
    const to = r.activeTo ? new Date(r.activeTo).getTime() : Infinity;
    return now >= from && now <= to;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={24} className="text-[#C9A227]" /> Commission Rules
          </h1>
          <p className="text-sm text-gray-700 mt-1">{total} rules - basis points, scope, active dates</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold flex items-center gap-2">
          <Plus size={18} /> New Rule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 p-4 flex gap-3">
        <select value={filter.scopeType} onChange={(e) => setFilter({ ...filter, scopeType: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All Scopes</option>
          {SCOPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filter.active} onChange={(e) => setFilter({ ...filter, active: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All States</option>
          <option value="true">Active</option>
          <option value="false">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        : rules.length === 0 ? <div className="p-12 text-center text-gray-700">No commission rules</div>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Basis</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Entries</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map((r) => {
                const active = isActive(r);
                return (
                  <tr key={r.id} className="hover:bg-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{r.scopeType}</p>
                      {r.scopeId && <p className="text-xs font-mono text-gray-700">{r.scopeId.slice(0, 8)}...</p>}
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold">{r.basis}</span></td>
                    <td className="px-4 py-3 font-mono text-gray-900">
                      {r.basis === "FIXED" ? `${r.currency} ${(r.fixedMinor / 100).toFixed(2)}` : `${(r.rateBps / 100).toFixed(2)}%`}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r._count?.entries ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("px-2 py-0.5 rounded text-xs font-bold", active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                        {active ? "ACTIVE" : "EXPIRED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-blue-100 text-blue-700" title="Edit"><Save size={15} /></button>
                        <button onClick={() => remove(r.id)} className="p-1.5 rounded hover:bg-red-100 text-red-700" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit Rule" : "New Commission Rule"}</h3>
              <button onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Scope Type</label>
                  <select value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    {SCOPES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Basis</label>
                  <select value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    {BASES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              {form.basis === "FIXED" ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Fixed Amount (minor units)</label>
                  <input type="number" value={form.fixedMinor} onChange={(e) => setForm({ ...form, fixedMinor: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Rate (basis points, 10000 = 100%)</label>
                  <input type="number" value={form.rateBps} onChange={(e) => setForm({ ...form, rateBps: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <p className="text-xs text-gray-700 mt-1">{form.basis} of eligible amount = {(form.rateBps / 100).toFixed(2)}%</p>
                </div>
              )}
              <button type="submit" disabled={busy} className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-bold disabled:opacity-50">
                {busy ? "Saving..." : editing ? "Update Rule" : "Create Rule"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
