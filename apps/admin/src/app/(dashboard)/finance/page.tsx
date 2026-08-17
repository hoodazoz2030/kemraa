"use client";
import { useEffect, useState } from "react";
import { financeApi } from "@/lib/api";
import { DollarSign, Loader2, Calendar, TrendingUp, TrendingDown, Receipt } from "lucide-react";

export default function FinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    setLoading(true);
    try { setData(await financeApi.summary(range.from, range.to)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [range.from, range.to]);

  const fmt = (minor: number) => `EGP ${(minor / 100).toLocaleString("en-EG", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={24} className="text-[#C9A227]" /> Finance Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">P&L snapshot • VAT 14% • Net revenue</p>
        </div>
        <div className="flex gap-2 items-center">
          <Calendar size={14} className="text-gray-400" />
          <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
          <span className="text-gray-400">→</span>
          <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={24} /></div>
      ) : data && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-blue-600" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Gross Revenue</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmt(data.gross)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.total} transactions</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={16} className="text-[#C9A227]" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Captured</p>
              </div>
              <p className="text-2xl font-bold text-[#C9A227]">{fmt(data.captured)}</p>
              <p className="text-xs text-gray-400 mt-1">Settled & paid</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} className="text-red-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">VAT (14%)</p>
              </div>
              <p className="text-2xl font-bold text-red-600">-{fmt(data.tax)}</p>
              <p className="text-xs text-gray-400 mt-1">Payable to tax authority</p>
            </div>
            <div className="bg-gradient-to-br from-[#C9A227] to-[#E6C55C] p-5 rounded-xl text-[#0C0A06]">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} />
                <p className="text-xs uppercase tracking-wider font-semibold">Net Revenue</p>
              </div>
              <p className="text-2xl font-bold">{fmt(data.net)}</p>
              <p className="text-xs opacity-70 mt-1">After VAT & refunds</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">By Status</h3>
              <div className="space-y-2">
                {Object.entries(data.byStatus).map(([status, v]: any) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{status}</span>
                    <div className="text-right">
                      <span className="font-mono">{v.count}×</span>
                      <span className="ml-2 font-semibold">{fmt(v.total)}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(data.byStatus).length === 0 && <p className="text-sm text-gray-400">No data</p>}
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">By Provider</h3>
              <div className="space-y-2">
                {Object.entries(data.byProvider).map(([prov, v]: any) => (
                  <div key={prov} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{prov}</span>
                    <div className="text-right">
                      <span className="font-mono">{v.count}×</span>
                      <span className="ml-2 font-semibold">{fmt(v.total)}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(data.byProvider).length === 0 && <p className="text-sm text-gray-400">No data</p>}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">💡 Coming next message:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Commission payout report (per partner + driver)</li>
              <li>CSV / Excel export</li>
              <li>Monthly tax filing view</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
