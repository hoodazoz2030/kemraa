"use client";
import { useEffect, useState } from "react";
import { driversApi, type Driver } from "@/lib/api";
import { Car, Loader2, Check, X, Search, UserCheck, UserX, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", verification: "", search: "" });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([driversApi.list(filter), driversApi.stats()]);
      setDrivers(d.items); setTotal(d.total); setStats(s);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const verify = async (id: string) => {
    const ref = prompt("License reference (optional):");
    await driversApi.verify(id, ref ?? undefined);
    await load();
  };
  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    await driversApi.reject(rejectId, rejectReason);
    setRejectId(null); setRejectReason(""); await load();
  };
  const setStatus = async (id: string, status: string) => { await driversApi.setStatus(id, status); await load(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Car size={24} className="text-[#C9A227]" /> Drivers Management
        </h1>
        <p className="text-sm text-gray-600 mt-1">{total} drivers • Verification & status control</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Verified</p>
            <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Online Now</p>
            <p className="text-2xl font-bold text-blue-600">{stats.online}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-4 gap-3">
        <div className="col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filter.search}
            onChange={(e) => { setFilter({ ...filter, search: e.target.value }); setTimeout(load, 300); }}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <select value={filter.verification} onChange={(e) => { setFilter({ ...filter, verification: e.target.value }); load(); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          <option value="">All Verification</option><option>VERIFIED</option><option>UNVERIFIED</option>
        </select>
        <select value={filter.status} onChange={(e) => { setFilter({ ...filter, status: e.target.value }); load(); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          <option value="">All Status</option><option>ONLINE</option><option>OFFLINE</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        ) : drivers.length === 0 ? (
          <div className="p-12 text-center text-gray-600"><Car size={40} className="mx-auto mb-3 text-gray-300" />No drivers</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-left text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Rides</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drivers.map((d) => {
                const name = [d.user?.profile?.firstName, d.user?.profile?.lastName].filter(Boolean).join(" ") || d.user?.email || "—";
                const isVerified = d.verificationStatus === "VERIFIED";
                const isOnline = d.status === "ONLINE";
                return (
                  <tr key={d.userId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-sm flex items-center justify-center">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{name}</p>
                          <p className="text-xs text-gray-600" dir="ltr">{d.user?.email ?? d.user?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold",
                        isVerified ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                        {isVerified ? <ShieldCheck size={12} /> : <UserX size={12} />}
                        {d.verificationStatus}
                      </span>
                      {d.licenseRef && <p className="text-[10px] text-gray-600 mt-0.5" dir="ltr">#{d.licenseRef}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold",
                        isOnline ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                        <span className={clsx("w-1.5 h-1.5 rounded-full", isOnline ? "bg-blue-500" : "bg-gray-400")} />
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{d.rating ? d.rating.toFixed(1) : "—"}</td>
                    <td className="px-4 py-3">{d._count.rides}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {!isVerified ? (
                          <>
                            <button onClick={() => verify(d.userId)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Verify"><Check size={15} /></button>
                            <button onClick={() => setRejectId(d.userId)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Reject"><X size={15} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setStatus(d.userId, isOnline ? "OFFLINE" : "ONLINE")}
                              className={clsx("p-1.5 rounded", isOnline ? "hover:bg-gray-100 text-gray-600" : "hover:bg-blue-50 text-blue-600")}
                              title={isOnline ? "Go Offline" : "Go Online"}>
                              {isOnline ? <UserX size={15} /> : <UserCheck size={15} />}
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

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold">Reject Driver</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..." rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            <div className="flex gap-2">
              <button onClick={() => setRejectId(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={reject} disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
