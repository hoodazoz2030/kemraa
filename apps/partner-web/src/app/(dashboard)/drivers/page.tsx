"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerDriversApi } from "@/lib/api";
import { ShieldCheck, Users } from "lucide-react";

const STATUS_COLORS: any = {
  ONLINE: "bg-green-500/10 text-green-400",
  OFFLINE: "bg-gray-500/10 text-gray-400",
  BUSY: "bg-yellow-500/10 text-yellow-400",
  SUSPENDED: "bg-red-500/10 text-red-400",
};

export default function DriversPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["drivers"], queryFn: () => partnerDriversApi.list() });
  const stats = useQuery({ queryKey: ["driver-stats"], queryFn: () => partnerDriversApi.stats() });

  const statusMut = useMutation({
    mutationFn: (v: { userId: string; status: string }) => partnerDriversApi.updateStatus(v.userId, v.status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["drivers"] }); qc.invalidateQueries({ queryKey: ["driver-stats"] }); },
  });
  const verifyMut = useMutation({
    mutationFn: (userId: string) => partnerDriversApi.verify(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });

  const items = data?.items ?? [];
  const st = stats.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Drivers</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Manage your fleet drivers, verification, and availability</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total" value={st?.total ?? 0} color="text-kemraa-gold" />
        <Stat label="Online" value={st?.byStatus?.ONLINE ?? 0} color="text-green-400" />
        <Stat label="Offline" value={st?.byStatus?.OFFLINE ?? 0} color="text-gray-400" />
        <Stat label="Busy" value={st?.byStatus?.BUSY ?? 0} color="text-yellow-400" />
        <Stat label="Suspended" value={st?.byStatus?.SUSPENDED ?? 0} color="text-red-400" />
        <Stat label="Verified" value={st?.verified ?? 0} color="text-emerald-400" />
      </div>

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading drivers...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">
          No drivers linked to your company yet.
        </div>
      ) : (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kemraa-goldDark/20 text-left">
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">DRIVER</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">STATUS</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">VERIFICATION</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">VEHICLES</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">RIDES</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">ACTIONS</th>
            </tr></thead>
            <tbody>
              {items.map((d: any) => (
                <tr key={d.userId} className="border-b border-kemraa-goldDark/10 last:border-0 hover:bg-white/5 transition">
                  <td className="px-5 py-4">
                    <div className="text-kemraa-text font-semibold">{d.user?.profile?.firstName} {d.user?.profile?.lastName}</div>
                    <div className="text-xs text-kemraa-text/50">{d.user?.email}</div>
                  </td>
                  <td className="px-5 py-4"><span className={`px-2 py-1 rounded text-[10px] tracking-wider ${STATUS_COLORS[d.status]}`}>{d.status}</span></td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] tracking-wider ${d.verificationStatus === "VERIFIED" ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"}`}>{d.verificationStatus}</span>
                  </td>
                  <td className="px-5 py-4 text-kemraa-text/70">{d.vehicles?.length ?? 0}</td>
                  <td className="px-5 py-4 text-kemraa-text/70">{d._count?.rides ?? 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {d.verificationStatus !== "VERIFIED" && (
                        <button onClick={() => verifyMut.mutate(d.userId)} title="Verify driver" className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs">
                          <ShieldCheck size={14} /> Verify
                        </button>
                      )}
                      {d.status !== "ONLINE" && d.status !== "SUSPENDED" && (
                        <button onClick={() => statusMut.mutate({ userId: d.userId, status: "ONLINE" })} className="px-2.5 py-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs">Online</button>
                      )}
                      {d.status !== "OFFLINE" && (
                        <button onClick={() => statusMut.mutate({ userId: d.userId, status: "OFFLINE" })} className="px-2.5 py-1.5 rounded bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 text-xs">Offline</button>
                      )}
                      {d.status !== "SUSPENDED" ? (
                        <button onClick={() => statusMut.mutate({ userId: d.userId, status: "SUSPENDED" })} className="px-2.5 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs">Suspend</button>
                      ) : (
                        <button onClick={() => statusMut.mutate({ userId: d.userId, status: "OFFLINE" })} className="px-2.5 py-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs">Reactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: any) {
  return (
    <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-kemraa-text/60 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}