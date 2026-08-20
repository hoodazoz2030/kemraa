"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Receipt } from "lucide-react";

function fmt(m: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100); }
function stColor(s: string) {
  if (s === "PAID") return "bg-emerald-500/10 text-emerald-400";
  if (s === "APPROVED") return "bg-green-500/10 text-green-400";
  if (s === "CLOSED") return "bg-yellow-500/10 text-yellow-400";
  return "bg-blue-500/10 text-blue-400";
}

export default function SettlementsPage() {
  const [sel, setSel] = useState<any>(null);
  const list = useQuery({ queryKey: ["settlements"], queryFn: () => api.get("/partner-finance/settlements").then((r) => r.data) });
  const detail = useQuery({
    queryKey: ["settlement", sel?.id],
    queryFn: () => api.get(`/partner-finance/settlements/${sel.id}`).then((r) => r.data),
    enabled: !!sel,
  });
  const items = list.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Settlements</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Your payout periods: Gross → Commission → Net</p>
      </div>

      {list.isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading settlements...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No settlements yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.map((s: any) => (
              <button key={s.id} onClick={() => setSel(s)} className={`w-full text-left bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border rounded-xl p-5 transition ${sel?.id === s.id ? "border-kemraa-gold" : "border-kemraa-goldDark/20 hover:border-kemraa-goldDark/50"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center"><Receipt size={16} className="text-kemraa-dark" /></div>
                    <div>
                      <div className="text-sm text-kemraa-text font-semibold">{new Date(s.periodStart).toLocaleDateString()} → {new Date(s.periodEnd).toLocaleDateString()}</div>
                      <div className="text-[10px] text-kemraa-text/50 uppercase tracking-wider">{s.currency}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] tracking-wider ${stColor(s.status)}`}>{s.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-[10px] text-kemraa-text/50 uppercase">Gross</div><div className="text-kemraa-text font-semibold">{fmt(s.grossMinor)}</div></div>
                  <div><div className="text-[10px] text-kemraa-text/50 uppercase">Commission</div><div className="text-kemraa-text/80 font-semibold">{fmt(s.commissionMinor)}</div></div>
                  <div><div className="text-[10px] text-kemraa-text/50 uppercase">Net</div><div className="text-green-400 font-bold">{fmt(s.netMinor)}</div></div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl p-5 h-fit">
            <h3 className="text-kemraa-gold font-semibold mb-4 tracking-wider">Settlement Details</h3>
            {!sel ? (
              <div className="text-kemraa-text/50 text-sm">Select a settlement to view details.</div>
            ) : detail.isLoading ? (
              <div className="text-kemraa-text/60 text-sm">Loading...</div>
            ) : (
              <div className="space-y-3 text-sm">
                <Row k="Status" v={detail.data?.status} />
                <Row k="Entries" v={String(detail.data?.entriesCount ?? 0)} />
                <Row k="Gross" v={fmt(detail.data?.grossMinor ?? 0)} />
                <Row k="Commission" v={fmt(detail.data?.commissionMinor ?? 0)} />
                <Row k="Net" v={fmt(detail.data?.netMinor ?? 0)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: any) {
  return <div className="flex justify-between border-b border-kemraa-goldDark/10 pb-2"><span className="text-kemraa-text/60">{k}</span><span className="text-kemraa-text font-semibold">{v}</span></div>;
}