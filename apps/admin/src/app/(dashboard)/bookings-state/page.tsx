"use client";
import { useEffect, useState } from "react";
import { bookingsApi, bookingsStateApi } from "@/lib/api";
import { Calendar, Loader2, Eye, ArrowRight, X } from "lucide-react";
import clsx from "clsx";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-800",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  PAYMENT_PENDING: "bg-amber-100 text-amber-800",
  CONFIRMING: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  CANCEL_REQUESTED: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-gray-200 text-gray-700",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  DISPUTED: "bg-purple-100 text-purple-800",
};

export default function BookingsStatePage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([bookingsApi.list({ limit: 50 } as any), bookingsStateApi.stats()]);
      setBookings(Array.isArray(b) ? b : (b.items ?? []));
      setStats(s);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { setDetail(await bookingsStateApi.detail(id)); }
    catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setDetailLoading(false); }
  };

  const doTransition = async (toStatus: string) => {
    if (!detail) return;
    const reason = prompt(`Reason for ${detail.status} -> ${toStatus}:`);
    if (reason === null) return;
    setBusy(true);
    try {
      await bookingsStateApi.transition(detail.id, toStatus, reason || undefined);
      await openDetail(detail.id);
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={24} className="text-[#C9A227]" /> Bookings State Machine
        </h1>
        <p className="text-sm text-gray-700 mt-1">
          Enforced transitions, state history, no direct jumps to CONFIRMED
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {Object.entries(stats.byStatus).map(([s, c]) => (
            <div key={s} className="bg-white p-3 rounded-lg border border-gray-300">
              <p className={clsx("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block", STATUS_COLOR[s])}>{s}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{c as number}</p>
            </div>
          ))}
          <div className="bg-gray-900 text-white p-3 rounded-lg">
            <p className="text-[10px] font-bold uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        : bookings.length === 0 ? <div className="p-12 text-center text-gray-700"><Calendar size={40} className="mx-auto mb-3 text-gray-400" />No bookings yet</div>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Traveler</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900">{b.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-900">{b.service?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{b.traveler?.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-bold", STATUS_COLOR[b.status] ?? "bg-gray-200 text-gray-800")}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900">{b.currency} {(b.totalMinor / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(b.id)} className="p-1.5 rounded hover:bg-blue-100 text-blue-700" title="Detail"><Eye size={15} /></button>
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
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-3xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Booking {detail.id.slice(0, 8)}</h3>
                <p className="text-sm text-gray-700">{detail.service?.title}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-xs font-bold text-gray-700 uppercase">Current Status</p>
                <p className={clsx("px-2 py-1 rounded text-sm font-bold mt-1 inline-block", STATUS_COLOR[detail.status])}>{detail.status}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-xs font-bold text-gray-700 uppercase">Amount</p>
                <p className="text-lg font-bold text-gray-900">{detail.currency} {(detail.totalMinor / 100).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-xs font-bold text-gray-700 uppercase">History</p>
                <p className="text-lg font-bold text-gray-900">{detail.stateHistory?.length ?? 0} transitions</p>
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

            <div>
              <h4 className="font-bold text-gray-900 mb-2">State History</h4>
              {detail.stateHistory?.length === 0 ? (
                <p className="text-sm text-gray-700 py-3">No state history (created directly in current status)</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {detail.stateHistory.map((h: any) => (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
