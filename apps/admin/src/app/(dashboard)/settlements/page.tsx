"use client";
import { useEffect, useState } from "react";
import { settlementsApi, contractsApi, type Settlement } from "@/lib/api";
import { Receipt, Loader2, Check, DollarSign, Eye, FileText } from "lucide-react";
import clsx from "clsx";

export default function SettlementsPage() {
  const [items, setItems] = useState<Settlement[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", partnerId: "" });
  const [detail, setDetail] = useState<Settlement | null>(null);
  const downloadInvoice = async (s: Settlement) => {
    try {
      await contractsApi.downloadSettlementInvoice(s.id, s.partner?.organization?.displayName ?? "partner");
    } catch (e: any) {
      alert("Failed to download invoice: " + (e?.message || e));
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([settlementsApi.list(filter), settlementsApi.stats()]);
      setItems(s.items); setTotal(s.total); setStats(st);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter.status]);

  const fmt = (minor: number) => `EGP ${(minor / 100).toLocaleString("en-EG", { minimumFractionDigits: 2 })}`;

  const approve = async (s: Settlement) => {
    if (!confirm(`Approve settlement for ${s.partner.organization.displayName}?`)) return;
    await settlementsApi.approve(s.id);
    await load();
  };
  const pay = async (s: Settlement) => {
    if (!confirm(`Mark as PAID for ${s.partner.organization.displayName}?`)) return;
    await settlementsApi.pay(s.id);
    await load();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "OPEN": return "bg-yellow-100 text-yellow-700";
      case "APPROVED": return "bg-blue-100 text-blue-700";
      case "PAID": return "bg-green-100 text-green-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={24} className="text-[#C9A227]" /> Settlements
          </h1>
          <p className="text-sm text-gray-600 mt-1">{total} settlements • Partner payouts</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider">OPEN</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.OPEN}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Paid</p>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          </div>
          <div className="bg-gradient-to-br from-[#C9A227] to-[#E6C55C] p-4 rounded-xl text-[#0C0A06]">
            <p className="text-xs uppercase tracking-wider font-semibold">OPEN Amount</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt(stats.OPENAmountMinor)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-300 p-4">
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All Status</option>
          <option>OPEN</option><option>APPROVED</option><option>PAID</option><option>REJECTED</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-700"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-600"><Receipt size={40} className="mx-auto mb-3 text-gray-300" />No settlements yet<br/><span className="text-xs">Create from Partners page</span></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-100/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{s.partner?.organization?.displayName}</p>
                    <p className="text-xs text-gray-600">{s.partner?.organization?.legalName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(s.periodStart).toLocaleDateString()} → {new Date(s.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#C9A227]">{fmt(s.netMinor)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold", statusColor(s.status))}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {s.status === "OPEN" && (
                        <button onClick={() => approve(s)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Approve">
                          <Check size={15} />
                        </button>
                      )}
                      {(s.status === "APPROVED" || s.status === "OPEN") && (
                        <button onClick={() => pay(s)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Mark Paid">
                          <DollarSign size={15} />
                        </button>
                      )}
                      <button onClick={() => downloadInvoice(s)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Download Invoice"><FileText size={15} /></button>
                      <button onClick={() => setDetail(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="View">
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Settlement Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Partner:</span><span className="font-medium">{detail.partner?.organization?.displayName}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Period:</span><span>{new Date(detail.periodStart).toLocaleDateString()} → {new Date(detail.periodEnd).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Amount:</span><span className="font-bold text-[#C9A227]">{fmt(detail.netMinor)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Status:</span><span className={clsx("px-2 py-0.5 rounded text-xs font-semibold", statusColor(detail.status))}>{detail.status}</span></div>
              
              
            </div>
            <button onClick={() => setDetail(null)} className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
