"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { partnerFinanceApi } from "@/lib/api";
import { DollarSign, TrendingUp, Activity } from "lucide-react";

const PERIODS = [{ key: "day", label: "Today" }, { key: "week", label: "Week" }, { key: "month", label: "Month" }];
function fmt(m: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100); }

export default function FinancePage() {
  const [period, setPeriod] = useState("month");
  const summary = useQuery({ queryKey: ["fin-summary", period], queryFn: () => partnerFinanceApi.summary(period) });
  const entries = useQuery({ queryKey: ["fin-entries", period], queryFn: () => partnerFinanceApi.entries(period) });
  const s = summary.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Finance</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Gross revenue, KEMRAA commission, and your net payout</p>
        </div>
        <div className="flex gap-2 bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-4 py-2 rounded-md text-sm transition ${period === p.key ? "bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark font-semibold" : "text-kemraa-text/70 hover:text-kemraa-gold"}`}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icon={DollarSign} label="Gross Revenue" value={`EGP ${fmt(s?.gross?.minor ?? 0)}`} color="text-kemraa-gold" />
        <Card icon={TrendingUp} label="KEMRAA Commission" value={`EGP ${fmt(s?.commission?.minor ?? 0)}`} color="text-kemraa-text" />
        <Card icon={Activity} label="Net Payout" value={`EGP ${fmt(s?.net?.minor ?? 0)}`} color="text-green-400" />
      </div>

      <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-kemraa-goldDark/20 text-kemraa-gold tracking-wider text-sm font-semibold">Commission Entries</div>
        {entries.isLoading ? (
          <div className="text-kemraa-text/60 py-10 text-center">Loading...</div>
        ) : (entries.data?.items ?? []).length === 0 ? (
          <div className="text-kemraa-text/60 py-10 text-center">No commission entries for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kemraa-goldDark/20 text-left">
              <th className="px-5 py-3 text-kemraa-gold text-xs tracking-wider">BOOKING</th>
              <th className="px-5 py-3 text-kemraa-gold text-xs tracking-wider">BOOKING VALUE</th>
              <th className="px-5 py-3 text-kemraa-gold text-xs tracking-wider">COMMISSION</th>
              <th className="px-5 py-3 text-kemraa-gold text-xs tracking-wider">STATUS</th>
              <th className="px-5 py-3 text-kemraa-gold text-xs tracking-wider">DATE</th>
            </tr></thead>
            <tbody>
              {(entries.data?.items ?? []).map((e: any) => (
                <tr key={e.id} className="border-b border-kemraa-goldDark/10 last:border-0">
                  <td className="px-5 py-3 font-mono text-kemraa-gold">{e.bookingId?.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-kemraa-text">{e.currency} {fmt(e.booking?.totalMinor ?? 0)}</td>
                  <td className="px-5 py-3 text-kemraa-gold font-semibold">EGP {fmt(e.amountMinor)}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-1 rounded text-[10px] tracking-wider ${e.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : e.status === "ELIGIBLE" ? "bg-green-500/10 text-green-400" : e.status === "REVERSED" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>{e.status}</span></td>
                  <td className="px-5 py-3 text-kemraa-text/60">{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-5">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center mb-3"><Icon size={20} className="text-kemraa-dark" /></div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-kemraa-text/60 tracking-wider mt-1 uppercase">{label}</div>
    </div>
  );
}