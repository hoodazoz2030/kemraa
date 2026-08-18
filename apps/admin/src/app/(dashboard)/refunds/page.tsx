"use client";

import { useEffect, useState } from "react";
import { refundsApi, type Refund } from "@/lib/api";
import {
  RefreshCw, Search, Loader2, XCircle, CheckCircle2, Clock,
  ArrowRightLeft, X,
} from "lucide-react";
import clsx from "clsx";

const statusMeta: Record<string, { color: string; bg: string; icon: any }> = {
  PENDING:    { color: "text-amber-700",  bg: "bg-amber-100",  icon: Clock },
  PROCESSING: { color: "text-blue-700",   bg: "bg-blue-100",   icon: RefreshCw },
  SUCCEEDED:  { color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  FAILED:     { color: "text-red-700",    bg: "bg-red-100",    icon: XCircle },
};

const egp = (minor: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await refundsApi.list();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runAction = async (id: string, action: "process" | "succeed" | "fail") => {
    if (action === "succeed" && !confirm("Confirm refund succeeded?")) return;
    if (action === "fail" && !confirm("Mark refund as failed?")) return;
    setActionLoading(id);
    try {
      if (action === "process") await refundsApi.process(id);
      if (action === "succeed") await refundsApi.succeed(id);
      if (action === "fail") await refundsApi.fail(id);
      await load();
    } catch (e) { alert("Action failed"); }
    finally { setActionLoading(null); }
  };

  const handleCreate = async () => {
    if (!selectedPaymentId || !refundAmount) return;
    setSaving(true);
    try {
      await refundsApi.create(selectedPaymentId, Math.round(parseFloat(refundAmount) * 100), refundReason);
      setCreateModal(false);
      setRefundAmount(""); setRefundReason(""); setSelectedPaymentId("");
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to create refund");
    } finally { setSaving(false); }
  };

  const filtered = refunds.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const email = r.payment?.booking?.traveler?.email ?? "";
      const service = r.payment?.booking?.service?.title ?? "";
      if (!email.toLowerCase().includes(q) && !service.toLowerCase().includes(q) && !r.reason?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totals = refunds.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + r.amountMinor;
    return acc;
  }, {} as Record<string, number>);

  const totalAmount = refunds.reduce((s, r) => s + r.amountMinor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft size={24} className="text-[#C9A227]" /> Refunds
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {refunds.length} refunds • {egp(totalAmount)} total
          </p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 flex items-center gap-2"
        >
          <XCircle size={18} /> New Refund
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(["PENDING", "PROCESSING", "SUCCEEDED", "FAILED"] as const).map((s) => {
          const count = refunds.filter((r) => r.status === s).length;
          const amt = totals[s] ?? 0;
          const st = statusMeta[s];
          return (
            <div key={s} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <st.icon size={18} className={st.color} />
                <span className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold", st.bg, st.color)}>{s}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-600 mt-1">{egp(amt)}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, service, or reason..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">All statuses</option>
          {Object.keys(statusMeta).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-[#C9A227] flex items-center gap-1.5">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" size={24} />Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><ArrowRightLeft size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-600">No refunds</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Traveler</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const st = statusMeta[r.status] ?? statusMeta.PENDING;
                const StIcon = st.icon;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 truncate">{r.payment?.booking?.service?.title ?? "—"}</p>
                      <p className="text-xs text-gray-600">{r.payment?.provider} • {r.payment?.methodType}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600" dir="ltr">{r.payment?.booking?.traveler?.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{egp(r.amountMinor, r.payment?.currency)}</p>
                      <p className="text-xs text-gray-600">of {egp(r.payment?.amountMinor ?? 0, r.payment?.currency)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{r.reason ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold", st.bg, st.color)}>
                        <StIcon size={12} /> {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "PENDING" && (
                          <button onClick={() => runAction(r.id, "process")} disabled={actionLoading !== null} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Process">
                            <RefreshCw size={15} />
                          </button>
                        )}
                        {(r.status === "PENDING" || r.status === "PROCESSING") && (
                          <>
                            <button onClick={() => runAction(r.id, "succeed")} disabled={actionLoading !== null} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Succeed">
                              <CheckCircle2 size={15} />
                            </button>
                            <button onClick={() => runAction(r.id, "fail")} disabled={actionLoading !== null} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Fail">
                              <XCircle size={15} />
                            </button>
                          </>
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

      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#C9A227]/30">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <XCircle size={20} className="text-[#C9A227]" /> New Refund
              </h3>
              <button onClick={() => setCreateModal(false)} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Payment ID</label>
                <input value={selectedPaymentId} onChange={(e) => setSelectedPaymentId(e.target.value)}
                  placeholder="UUID of the payment" dir="ltr"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Amount (EGP)</label>
                <input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Reason</label>
                <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Why refunding?" rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <button onClick={() => setCreateModal(false)} className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !selectedPaymentId || !refundAmount}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Create Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}