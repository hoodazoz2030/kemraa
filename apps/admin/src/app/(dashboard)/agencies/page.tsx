"use client";
import { useEffect, useState } from "react";
import { financeAdminApi } from "@/lib/api";
import { Building, Loader2, Save, X } from "lucide-react";

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ attributionWindowDays: 30 });
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try { setAgencies(await financeAdminApi.listAgencies()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openEdit = async (a: any) => {
    setEditing(a);
    setForm({ attributionWindowDays: a.attributionWindowDays });
    try { setStats(await financeAdminApi.agencyStats(a.organizationId)); } catch { setStats(null); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await financeAdminApi.updateAgency(editing.organizationId, form);
      setEditing(null); await load();
    } catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building size={24} className="text-[#C9A227]" /> Agencies
        </h1>
        <p className="text-sm text-gray-700 mt-1">Attribution windows, commission policies, referral stats</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        : agencies.length === 0 ? <div className="p-12 text-center text-gray-700"><Building size={40} className="mx-auto mb-3 text-gray-400" />No agencies yet</div>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Attribution Window</th>
                <th className="px-4 py-3">Policy ID</th>
                <th className="px-4 py-3">Attributions</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agencies.map((a) => (
                <tr key={a.organizationId} className="hover:bg-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{a.organization?.displayName}</p>
                    <p className="text-xs text-gray-700">{a.organization?.legalName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">{a.attributionWindowDays} days</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">{a.commissionPolicyId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{a._count?.attributions ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(a)} className="px-3 py-1 rounded-lg bg-[#C9A227] text-[#0C0A06] font-semibold text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editing.organization?.displayName}</h3>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800"><X size={18} /></button>
            </div>
            {stats && (
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-300">
                <div><p className="text-xs text-gray-700">Attributions</p><p className="font-bold">{stats.attributions}</p></div>
                <div><p className="text-xs text-gray-700">Attributed Customers</p><p className="font-bold">{stats.attributedCustomers}</p></div>
                <div><p className="text-xs text-gray-700">Earned</p><p className="font-bold">EGP {(stats.earnedCommissionMinor / 100).toFixed(2)}</p></div>
              </div>
            )}
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Attribution Window (days)</label>
                <input type="number" min={1} max={365} value={form.attributionWindowDays}
                  onChange={(e) => setForm({ ...form, attributionWindowDays: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                <p className="text-xs text-gray-700 mt-1">How long after referral a booking counts (1-365 days)</p>
              </div>
              <button type="submit" disabled={busy} className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
