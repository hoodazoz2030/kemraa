"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { partnerRidesApi } from "@/lib/api";
import { Car } from "lucide-react";

function fmt(m: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100); }
const R_STATUS: any = {
  REQUESTED: "bg-blue-500/10 text-blue-400",
  MATCHING: "bg-blue-500/10 text-blue-400",
  DRIVER_ASSIGNED: "bg-cyan-500/10 text-cyan-400",
  DRIVER_ARRIVING: "bg-yellow-500/10 text-yellow-400",
  DRIVER_ARRIVED: "bg-yellow-500/10 text-yellow-400",
  IN_PROGRESS: "bg-orange-500/10 text-orange-400",
  COMPLETED: "bg-emerald-500/10 text-emerald-400",
  CANCELLED: "bg-red-500/10 text-red-400",
};

export default function RidesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["rides"], queryFn: () => partnerRidesApi.list() });
  const stats = useQuery({ queryKey: ["ride-stats"], queryFn: () => partnerRidesApi.stats() });
  const items = data?.items ?? [];
  const st = stats.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Rides</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Transport operations across your drivers</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg px-4 py-2">Total: <span className="text-kemraa-gold font-bold">{st?.total ?? 0}</span></div>
          <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg px-4 py-2">Fares: <span className="text-green-400 font-bold">EGP {fmt(st?.totalFareMinor ?? 0)}</span></div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading rides...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No rides yet.</div>
      ) : (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kemraa-goldDark/20 text-left">
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">RIDE</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">DRIVER</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">FARE</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">STATUS</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">EVENTS</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">DATE</th>
            </tr></thead>
            <tbody>
              {items.map((r: any) => (
                <tr key={r.id} className="border-b border-kemraa-goldDark/10 last:border-0 hover:bg-white/5 transition">
                  <td className="px-5 py-4"><Link href={`/rides/${r.id}`} className="font-mono text-kemraa-gold hover:underline">{r.id.slice(0, 8)}</Link></td>
                  <td className="px-5 py-4 text-kemraa-text/80">{r.driver?.user?.email ?? "—"}</td>
                  <td className="px-5 py-4 text-kemraa-gold font-semibold">EGP {fmt(r.fareMinor)}</td>
                  <td className="px-5 py-4"><span className={`px-2 py-1 rounded text-[10px] tracking-wider ${R_STATUS[r.status] ?? "bg-gray-500/10 text-gray-400"}`}>{r.status}</span></td>
                  <td className="px-5 py-4 text-kemraa-text/60">{r.events?.length ?? 0}</td>
                  <td className="px-5 py-4 text-kemraa-text/60">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}