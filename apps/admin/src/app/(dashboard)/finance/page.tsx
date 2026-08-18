"use client";
import { useEffect, useState } from "react";
import { financeApi } from "@/lib/api";
import { DollarSign, Loader2, Calendar, TrendingUp, TrendingDown, Receipt, Download, PieChart, FileSpreadsheet } from "lucide-react";
import clsx from "clsx";

type Tab = "overview" | "commissions" | "tax";

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [commissions, setCommissions] = useState<any>(null);
  const [taxData, setTaxData] = useState<any>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [range, setRange] = useState({
    from: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    setLoading(true);
    try {
      if (tab === "overview") setOverview(await financeApi.summary(range.from, range.to));
      else if (tab === "commissions") setCommissions(await financeApi.commissions(range.from, range.to));
      else if (tab === "tax") setTaxData(await financeApi.taxFiling(month));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab, range.from, range.to, month]);

  const fmt = (minor: number) => `EGP ${(minor / 100).toLocaleString("en-EG", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={24} className="text-[#C9A227]" /> Finance Hub
          </h1>
          <p className="text-sm text-gray-600 mt-1">P&L • Commissions • Tax Filing • Export</p>
        </div>
        <button onClick={() => financeApi.exportCsv(range.from, range.to)}
          className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold flex items-center gap-2">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "overview", label: "Overview", icon: PieChart },
          { id: "commissions", label: "Commissions", icon: Receipt },
          { id: "tax", label: "Tax Filing", icon: FileSpreadsheet },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={clsx("px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition",
                tab === t.id ? "border-[#C9A227] text-[#C9A227]" : "border-transparent text-gray-600 hover:text-gray-700")}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <>
          <div className="flex gap-2 items-center bg-white p-3 rounded-xl border border-gray-200">
            <Calendar size={14} className="text-gray-500" />
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
            <span className="text-gray-500">→</span>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>

          {loading ? <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" size={24} /></div> : overview && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-blue-600" />
                    <p className="text-xs text-gray-600 uppercase tracking-wider">Gross</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{fmt(overview.gross)}</p>
                  <p className="text-xs text-gray-500 mt-1">{overview.total} transactions</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt size={16} className="text-[#C9A227]" />
                    <p className="text-xs text-gray-600 uppercase tracking-wider">Captured</p>
                  </div>
                  <p className="text-2xl font-bold text-[#C9A227]">{fmt(overview.captured)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={16} className="text-red-500" />
                    <p className="text-xs text-gray-600 uppercase tracking-wider">VAT (14%)</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">-{fmt(overview.tax)}</p>
                </div>
                <div className={clsx("p-5 rounded-xl", overview.net >= 0 ? "bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06]" : "bg-red-50 border border-red-200 text-red-900")}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} />
                    <p className="text-xs uppercase tracking-wider font-semibold">Net</p>
                  </div>
                  <p className="text-2xl font-bold">{fmt(overview.net)}</p>
                  <p className="text-xs opacity-70 mt-1">After VAT & refunds</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">By Status</h3>
                  <div className="space-y-2">
                    {Object.entries(overview.byStatus).map(([status, v]: any) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{status}</span>
                        <div className="text-right">
                          <span className="font-mono">{v.count}×</span>
                          <span className="ml-2 font-semibold">{fmt(v.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">By Provider</h3>
                  <div className="space-y-2">
                    {Object.entries(overview.byProvider).map(([prov, v]: any) => (
                      <div key={prov} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{prov}</span>
                        <div className="text-right">
                          <span className="font-mono">{v.count}×</span>
                          <span className="ml-2 font-semibold">{fmt(v.total)}</span>
                        </div>
                      </div>
                    ))}
                    {Object.keys(overview.byProvider).length === 0 && <p className="text-sm text-gray-500">No data</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "commissions" && (
        <>
          <div className="flex gap-2 items-center bg-white p-3 rounded-xl border border-gray-200">
            <Calendar size={14} className="text-gray-500" />
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
            <span className="text-gray-500">→</span>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>

          {loading ? <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" size={24} /></div> : commissions && (
            <>
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Grand Total Commissions</h3>
                  <p className="text-2xl font-bold text-[#C9A227]">{fmt(commissions.grandTotal)}</p>
                </div>
                <p className="text-sm text-gray-600">{commissions.totalEntries} entries</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b text-left text-xs uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Beneficiary</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Count</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(commissions.byBeneficiary).map(([key, v]: any) => (
                      <tr key={key} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600" dir="ltr">{v.beneficiaryId.slice(0, 8)}...</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{v.beneficiaryType}</span></td>
                        <td className="px-4 py-3 font-mono">{v.count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#C9A227]">{fmt(v.total)}</td>
                      </tr>
                    ))}
                    {Object.keys(commissions.byBeneficiary).length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500">No commission entries in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === "tax" && (
        <>
          <div className="flex gap-2 items-center bg-white p-3 rounded-xl border border-gray-200">
            <Calendar size={14} className="text-gray-500" />
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>

          {loading ? <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" size={24} /></div> : taxData && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">Gross</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{fmt(taxData.gross)}</p>
                  <p className="text-xs text-gray-500 mt-1">{taxData.transactions} txns</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">Refunded</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">-{fmt(taxData.refunded)}</p>
                  <p className="text-xs text-gray-500 mt-1">{taxData.refunds} refunds</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">Taxable</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{fmt(taxData.taxable)}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-xl text-white">
                  <p className="text-xs uppercase tracking-wider font-semibold">VAT Payable (14%)</p>
                  <p className="text-2xl font-bold mt-2">{fmt(taxData.tax)}</p>
                  <p className="text-xs opacity-70 mt-1">To Egyptian Tax Authority</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                <p className="font-semibold mb-1">📋 Filing summary for {taxData.month}</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Period: {new Date(taxData.from).toLocaleDateString()} → {new Date(taxData.to).toLocaleDateString()}</li>
                  <li>Total taxable revenue: {fmt(taxData.taxable)}</li>
                  <li>VAT to pay: {fmt(taxData.tax)}</li>
                  <li>Generated on: {new Date().toLocaleString()}</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
