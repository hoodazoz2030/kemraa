"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerBookingsApi } from "@/lib/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const STATUSES = ["ALL", "PENDING_APPROVAL", "CONFIRMED", "COMPLETED", "CANCELLED"];

function formatMinor(m: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100);
}

function statusColor(s: string) {
  const u = s?.toUpperCase();
  if (u === "COMPLETED") return "text-emerald-400 bg-emerald-500/10";
  if (["CONFIRMED", "CONFIRMING"].includes(u)) return "text-green-400 bg-green-500/10";
  if (["CANCELLED", "CANCEL_REQUESTED", "REJECTED", "FAILED"].includes(u)) return "text-red-400 bg-red-500/10";
  return "text-blue-400 bg-blue-500/10";
}

export default function BookingsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("ALL");

  const { data, isLoading } = useQuery({ queryKey: ["bookings"], queryFn: () => partnerBookingsApi.list() });
  const all = Array.isArray(data) ? data : data?.items ?? [];
  const items = filter === "ALL" ? all : all.filter((b: any) => b.status === filter);

  const act = (fn: (id: string) => Promise<any>) => ({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
  const approveMut = useMutation(act(partnerBookingsApi.approve));
  const rejectMut = useMutation(act((id) => partnerBookingsApi.reject(id, "Rejected by partner")));
  const confirmMut = useMutation(act(partnerBookingsApi.confirm));
  const completeMut = useMutation(act(partnerBookingsApi.complete));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Bookings</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Manage customer bookings for your services</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-sm transition ${filter === s ? "bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark font-semibold" : "bg-kemraa-darkAlt border border-kemraa-goldDark/20 text-kemraa-text/70 hover:text-kemraa-gold"}`}>
            {s === "ALL" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading bookings...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No bookings found.</div>
      ) : (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kemraa-goldDark/20 text-left">
                <th className="px-5 py-4 text-kemraa-gold tracking-wider text-xs">BOOKING</th>
                <th className="px-5 py-4 text-kemraa-gold tracking-wider text-xs">DATE</th>
                <th className="px-5 py-4 text-kemraa-gold tracking-wider text-xs">VALUE</th>
                <th className="px-5 py-4 text-kemraa-gold tracking-wider text-xs">STATUS</th>
                <th className="px-5 py-4 text-kemraa-gold tracking-wider text-xs">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b: any) => (
                <tr key={b.id} className="border-b border-kemraa-goldDark/10 last:border-0 hover:bg-white/5 transition">
                  <td className="px-5 py-4">
                    <Link href={`/bookings/${b.id}`} className="font-mono text-kemraa-gold hover:underline">{b.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-5 py-4 text-kemraa-text/70">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-kemraa-gold font-semibold">{b.currency} {formatMinor(b.totalMinor)}</td>
                  <td className="px-5 py-4"><span className={`px-2 py-1 rounded text-[10px] tracking-wider ${statusColor(b.status)}`}>{b.status}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {["PENDING_APPROVAL", "DRAFT"].includes(b.status) && (
                        <>
                          <button onClick={() => approveMut.mutate(b.id)} title="Approve" className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20"><CheckCircle size={16} /></button>
                          <button onClick={() => rejectMut.mutate(b.id)} title="Reject" className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"><XCircle size={16} /></button>
                        </>
                      )}
                      {b.status === "CONFIRMING" && (
                        <button onClick={() => confirmMut.mutate(b.id)} className="px-3 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20">Confirm</button>
                      )}
                      {b.status === "CONFIRMED" && (
                        <button onClick={() => completeMut.mutate(b.id)} className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20">Complete</button>
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
