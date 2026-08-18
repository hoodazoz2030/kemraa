"use client";
import { useEffect, useState } from "react";
import { paymentsStateApi } from "@/lib/api";
import { CreditCard, Loader2, Eye, ArrowRight, X, BookOpen } from "lucide-react";
import clsx from "clsx";

const STATUS_COLOR: Record<string, string> = {
  CREATED: "bg-gray-200 text-gray-800",
  REQUIRES_ACTION: "bg-yellow-100 text-yellow-800",
  AUTHORIZED: "bg-blue-100 text-blue-800",
  CAPTURED: "bg-emerald-100 text-emerald-800",
  SETTLED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  VOIDED: "bg-gray-300 text-gray-700",
  REFUND_PENDING: "bg-orange-100 text-orange-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  PARTIALLY_REFUNDED: "bg-purple-50 text-purple-700",
};

export default function PaymentsStatePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"history" | "ledger">("history");

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([paymentsStateApi.list({ limit: 50 }), paymentsStateApi.stats()]);
      setPayments(p.items ?? []);
      setStats(s);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { setDetail(await paymentsStateApi.detail(id)); setTab("history"); }
    catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setDetailLoading(false); }
  };

  const doTransition = async (toStatus: string) => {
    if (!detail) return;
    const reason = prompt(`Reason for ${detail.status} -> ${toStatus}:`);
    if (reason === null) return;
    let refundAmount: number | undefined;
    if (toStatus === "PARTIALLY_REFUNDED") {
      const input = prompt(`Refund amount in minor units (max ${detail.amountMinor - 1}):`);
      if (!input) return;
      refundAmount = parseInt(input);
    }
    setBusy(true);
    try {
      await paymentsStateApi.transition(detail.id, toStatus, reason || undefined, undefined, refundAmount);
      await openDetail(detail.id);
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard size={24} className="text-[#C9A227]" /> Payments State Machine
        </h1>
        <p className="text-sm text-gray-700 mt-1">
          Enforced transitions, auto ledger linking, idempotency, no jumps
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-700 uppercase font-bold">Total Payments</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPayments}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-700 uppercase font-bold">Ledger Entries</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.totalLedgerEntries}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-300">
            <p className="text-xs text-amber-900 uppercase font-bold">Auto-Ledger</p>
            <p className="text-sm text-amber-800 mt-1">Every state transition creates paired DEBIT/CREDIT entries</p>
          </div>
        </div>
      )}

      {stats && Object.keys(stats.byStatus).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(stats.byStatus).map(([s, v]: any) => (
            <div key={s} className="bg-white p-3 rounded-lg border border-gray-300">
              <p className={clsx("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block", STATUS_COLOR[s])}>{s}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{v.count}</p>
              <p className="text-xs text-gray-600">EGP {(v.totalMinor / 100).toFixed(0)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        : payments.length === 0 ? <div className="p-12 text-center text-gray-700"><CreditCard size={40} className="mx-auto mb-3 text-gray-400" />No payments yet</div>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Ledger</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900">{p.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-bold", STATUS_COLOR[p.status])}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900">{p.currency} {(p.amountMinor / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-700">{p.methodType}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{p.provider}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{p._count?.ledger ?? 0} entries</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(p.id)} className="p-1.5 rounded hover:bg-blue-100 text-blue-700" title="Detail"><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Loader2 className="animate-spin text-white" size={40} />
        </div>
      )}

      {detail && !detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-4xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Payment {detail.id.slice(0, 8)}</h3>
                <p className="text-sm text-gray-700">Provider: {detail.provider} • Method: {detail.methodType}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-xs font-bold text-gray-700 uppercase">Status</p>
                <p className={clsx("px-2 py-1 rounded text-sm font-bold mt-1 inline-block", STATUS_COLOR[detail.status])}>{detail.status}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-xs font-bold text-gray-700 uppercase">Amount</p>
                <p className="text-lg font-bold text-gray-900">{detail.currency} {(detail.amountMinor / 100).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-xs font-bold text-gray-700 uppercase">Ledger</p>
                <p className="text-lg font-bold text-gray-900">{detail.ledger?.length ?? 0} entries</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-xs font-bold text-gray-700 uppercase">Refunds</p>
                <p className="text-lg font-bold text-gray-900">{detail.refunds?.length ?? 0}</p>
              </div>
            </div>

            {detail.allowedTransitions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                <p className="text-xs font-bold text-blue-800 uppercase mb-2">Allowed transitions from {detail.status}:</p>
                <div className="flex flex-wrap gap-2">
                  {detail.allowedTransitions.map((t: string) => (
                    <button key={t} onClick={() => doTransition(t)} disabled={busy}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                      <ArrowRight size={12} /> {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-b border-gray-300 mb-3 flex gap-4">
              <button onClick={() => setTab("history")}
                className={clsx("px-3 py-2 text-sm font-semibold border-b-2 transition",
                  tab === "history" ? "border-[#C9A227] text-[#C9A227]" : "border-transparent text-gray-600 hover:text-gray-900")}>
                State History ({detail.stateHistory?.length ?? 0})
              </button>
              <button onClick={() => setTab("ledger")}
                className={clsx("px-3 py-2 text-sm font-semibold border-b-2 transition",
                  tab === "ledger" ? "border-[#C9A227] text-[#C9A227]" : "border-transparent text-gray-600 hover:text-gray-900")}>
                Ledger Entries ({detail.ledger?.length ?? 0})
              </button>
            </div>

            {tab === "history" && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {detail.stateHistory?.length === 0 ? (
                  <p className="text-sm text-gray-700 py-3">No state history</p>
                ) : detail.stateHistory.map((h: any) => (
                  <div key={h.id} className="p-2 border border-gray-300 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={clsx("px-2 py-0.5 rounded font-bold", STATUS_COLOR[h.fromStatus])}>{h.fromStatus}</span>
                      <ArrowRight size={12} />
                      <span className={clsx("px-2 py-0.5 rounded font-bold", STATUS_COLOR[h.toStatus])}>{h.toStatus}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-700 font-semibold">{h.actorType}{h.reason ? ` — ${h.reason}` : ""}</p>
                      <p className="text-gray-500">{new Date(h.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "ledger" && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {detail.ledger?.length === 0 ? (
                  <p className="text-sm text-gray-700 py-3">No ledger entries yet (created on AUTHORIZED/CAPTURED/VOIDED/REFUNDED)</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="text-left text-gray-700 uppercase tracking-wider">
                      <tr><th className="py-1">Account</th><th>Direction</th><th>Amount</th><th>Ref</th><th>At</th></tr>
                    </thead>
                    <tbody>
                      {detail.ledger.map((l: any) => (
                        <tr key={l.id} className="border-t border-gray-200">
                          <td className="py-1 font-mono text-gray-900">{l.accountId}</td>
                          <td className={clsx("font-bold", l.direction === "DEBIT" ? "text-red-700" : "text-green-700")}>{l.direction}</td>
                          <td className="font-mono">{l.currency} {(l.amountMinor / 100).toFixed(2)}</td>
                          <td className="text-gray-600">{l.referenceType}</td>
                          <td className="text-gray-600">{new Date(l.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
