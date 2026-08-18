"use client";

import { useEffect, useState } from "react";
import { commissionsApi, type CommissionRule, type CommissionEntry } from "@/lib/api";
import {
  Percent, RefreshCw, Search, Loader2, CheckCircle2, Clock, Plus,
  DollarSign, X, Save, TrendingUp, FileText,
} from "lucide-react";
import clsx from "clsx";

const statusMeta: Record<string, { color: string; bg: string }> = {
  PENDING:  { color: "text-gray-700",    bg: "bg-gray-100" },
  ELIGIBLE: { color: "text-blue-700",    bg: "bg-blue-100" },
  PAID:     { color: "text-green-700",   bg: "bg-green-100" },
  REVERSED: { color: "text-red-700",     bg: "bg-red-100" },
};

const egp = (minor: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);

export default function CommissionsPage() {
  const [tab, setTab] = useState<"entries" | "rules">("entries");
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [ruleModal, setRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [ruleForm, setRuleForm] = useState({ scopeType: "GLOBAL", basis: "NET", rateBps: "1000", fixedMinor: "0", currency: "EGP" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [e, r] = await Promise.all([commissionsApi.listEntries(), commissionsApi.listRules()]);
      setEntries(Array.isArray(e) ? e : []);
      setRules(Array.isArray(r) ? r : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, action: "eligible" | "paid") => {
    setActionLoading(id);
    try {
      if (action === "eligible") await commissionsApi.markEligible(id);
      if (action === "paid") await commissionsApi.markPaid(id);
      await load();
    } catch (e) { alert("Action failed"); }
    finally { setActionLoading(null); }
  };

  const openCreateRule = () => {
    setEditingRule(null);
    setRuleForm({ scopeType: "GLOBAL", basis: "NET", rateBps: "1000", fixedMinor: "0", currency: "EGP" });
    setRuleModal(true);
  };

  const openEditRule = (r: CommissionRule) => {
    setEditingRule(r);
    setRuleForm({
      scopeType: r.scopeType, basis: r.basis,
      rateBps: String(r.rateBps), fixedMinor: String(r.fixedMinor), currency: r.currency,
    });
    setRuleModal(true);
  };

  const handleSaveRule = async () => {
    setSaving(true);
    try {
      const payload: any = {
        scopeType: ruleForm.scopeType, basis: ruleForm.basis,
        rateBps: parseInt(ruleForm.rateBps) || 0,
        fixedMinor: parseInt(ruleForm.fixedMinor) || 0,
        currency: ruleForm.currency,
      };
      if (editingRule) await commissionsApi.updateRule(editingRule.id, payload);
      else await commissionsApi.createRule(payload);
      setRuleModal(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to save rule");
    } finally { setSaving(false); }
  };

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const svc = e.booking?.service?.title ?? "";
    const email = e.booking?.traveler?.email ?? "";
    return svc.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const totalPending = entries.filter((e) => e.status === "PENDING").reduce((s, e) => s + e.amountMinor, 0);
  const totalEligible = entries.filter((e) => e.status === "ELIGIBLE").reduce((s, e) => s + e.amountMinor, 0);
  const totalPaid = entries.filter((e) => e.status === "PAID").reduce((s, e) => s + e.amountMinor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Percent size={24} className="text-[#C9A227]" /> Commissions
          </h1>
          <p className="text-sm text-gray-600 mt-1">{rules.length} active rules • {entries.length} entries</p>
        </div>
        <button onClick={openCreateRule}
          className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 flex items-center gap-2">
          <Plus size={18} /> New Rule
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-300 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock size={18} className="text-gray-600" />
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">PENDING</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{entries.filter((e) => e.status === "PENDING").length}</p>
          <p className="text-xs text-gray-600 mt-1">{egp(totalPending)}</p>
        </div>
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={18} className="text-blue-600" />
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">ELIGIBLE</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{entries.filter((e) => e.status === "ELIGIBLE").length}</p>
          <p className="text-xs text-gray-600 mt-1">{egp(totalEligible)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#C9A227]/10 to-[#E6C55C]/10 border border-[#C9A227]/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={18} className="text-[#8C6D1F]" />
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">PAID</span>
          </div>
          <p className="text-2xl font-bold text-[#8C6D1F]">{entries.filter((e) => e.status === "PAID").length}</p>
          <p className="text-xs text-[#8C6D1F] mt-1">{egp(totalPaid)}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-300">
        <button onClick={() => setTab("entries")}
          className={clsx("px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-1.5",
            tab === "entries" ? "border-[#C9A227] text-[#8C6D1F]" : "border-transparent text-gray-600")}>
          <FileText size={14} /> Entries ({entries.length})
        </button>
        <button onClick={() => setTab("rules")}
          className={clsx("px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-1.5",
            tab === "rules" ? "border-[#C9A227] text-[#8C6D1F]" : "border-transparent text-gray-600")}>
          <Percent size={14} /> Rules ({rules.length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-700"><Loader2 className="animate-spin mx-auto mb-2" size={24} />Loading...</div>
      ) : tab === "entries" ? (
        <>
          <div className="bg-white rounded-xl border border-gray-300 p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by service or traveler..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center"><Percent size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-600">No entries</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-800">
                    <th className="px-4 py-3 font-semibold">Service</th>
                    <th className="px-4 py-3 font-semibold">Traveler</th>
                    <th className="px-4 py-3 font-semibold">Beneficiary</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Rate</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((e) => {
                    const st = statusMeta[e.status] ?? statusMeta.PENDING;
                    const rate = (e as any).rule?.rateBps ?? 0;
                    return (
                      <tr key={e.id} className="hover:bg-gray-100/50 transition">
                        <td className="px-4 py-3 font-semibold text-gray-900">{e.booking?.service?.title ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600" dir="ltr">{e.booking?.traveler?.email ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{e.beneficiaryType}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{egp(e.amountMinor, e.currency)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{(rate / 100).toFixed(2)}%</td>
                        <td className="px-4 py-3">
                          <span className={clsx("inline-flex px-2 py-0.5 rounded text-xs font-semibold", st.bg, st.color)}>{e.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{new Date(e.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {e.status === "PENDING" && (
                              <button onClick={() => handleAction(e.id, "eligible")} disabled={actionLoading !== null} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Mark Eligible">
                                <TrendingUp size={15} />
                              </button>
                            )}
                            {(e.status === "PENDING" || e.status === "ELIGIBLE") && (
                              <button onClick={() => handleAction(e.id, "paid")} disabled={actionLoading !== null} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Mark Paid">
                                <DollarSign size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
          {rules.length === 0 ? (
            <div className="p-12 text-center"><Percent size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-600">No rules yet</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-800">
                  <th className="px-4 py-3 font-semibold">Scope</th>
                  <th className="px-4 py-3 font-semibold">Basis</th>
                  <th className="px-4 py-3 font-semibold">Rate</th>
                  <th className="px-4 py-3 font-semibold">Fixed Fee</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-100/50 transition">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">{r.scopeType}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.basis}</td>
                    <td className="px-4 py-3 font-semibold text-[#8C6D1F]">{(r.rateBps / 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-gray-600">{r.fixedMinor > 0 ? egp(r.fixedMinor, r.currency) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.activeFrom).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditRule(r)} className="px-3 py-1 rounded text-xs font-medium text-[#8C6D1F] bg-[#F0D78C]/30 hover:bg-[#F0D78C]/50">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {ruleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-md border border-[#C9A227]/30">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Percent size={20} className="text-[#C9A227]" /> {editingRule ? "Edit Rule" : "New Commission Rule"}
              </h3>
              <button onClick={() => setRuleModal(false)} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Scope</label>
                  <select value={ruleForm.scopeType} onChange={(e) => setRuleForm({ ...ruleForm, scopeType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    <option value="GLOBAL">GLOBAL</option>
                    <option value="SERVICE">SERVICE</option>
                    <option value="PARTNER">PARTNER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Basis</label>
                  <select value={ruleForm.basis} onChange={(e) => setRuleForm({ ...ruleForm, basis: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    <option value="NET">NET</option>
                    <option value="GROSS">GROSS</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Rate (bps)</label>
                  <input type="number" value={ruleForm.rateBps} onChange={(e) => setRuleForm({ ...ruleForm, rateBps: e.target.value })}
                    placeholder="1000 = 10%"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                  <p className="text-[10px] text-gray-600 mt-1">{(parseInt(ruleForm.rateBps || "0") / 100).toFixed(2)}%</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Fixed Fee (minor)</label>
                  <input type="number" value={ruleForm.fixedMinor} onChange={(e) => setRuleForm({ ...ruleForm, fixedMinor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                  <p className="text-[10px] text-gray-600 mt-1">{egp(parseInt(ruleForm.fixedMinor || "0"))}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t bg-gray-100">
              <button onClick={() => setRuleModal(false)} className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSaveRule} disabled={saving}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}