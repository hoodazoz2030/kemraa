"use client";

import { useEffect, useState } from "react";
import { tripsApi, type Trip, type ItineraryItem } from "@/lib/api";
import {
  Map, Search, Filter, Loader2, Calendar, DollarSign,
  CheckCircle2, XCircle, Eye, Plane, MapPin, Clock, AlertCircle,
  Plus, X,
} from "lucide-react";
import clsx from "clsx";

const STATUSES = ["", "DRAFT", "PLANNING", "READY", "ACTIVE", "COMPLETED", "CANCELLED"];

const statusMeta: Record<string, { color: string; bg: string; icon: any }> = {
  DRAFT:     { color: "text-gray-700",   bg: "bg-gray-100",   icon: AlertCircle },
  PLANNING:  { color: "text-blue-700",   bg: "bg-blue-100",   icon: Clock },
  READY:     { color: "text-purple-700", bg: "bg-purple-100", icon: AlertCircle },
  ACTIVE:    { color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  COMPLETED: { color: "text-gray-700",   bg: "bg-gray-200",   icon: CheckCircle2 },
  CANCELLED: { color: "text-red-700",    bg: "bg-red-100",    icon: XCircle },
};

const egp = (minor: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : "—");

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Trip | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await tripsApi.list({ status: statusFilter || undefined });
      setTrips(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const t = await tripsApi.get(id);
      setSelected(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this trip? It will become ACTIVE.")) return;
    setActionLoading(true);
    try {
      await tripsApi.approve(id);
      await load();
      if (selected?.id === id) await loadDetail(id);
    } catch (e) {
      alert("Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await tripsApi.reject(selected.id, rejectReason.trim());
      setShowReject(false);
      setRejectReason("");
      await load();
      await loadDetail(selected.id);
    } catch (e) {
      alert("Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReview = async (id: string) => {
    setActionLoading(true);
    try {
      await tripsApi.requestReview(id);
      await load();
      if (selected?.id === id) await loadDetail(id);
    } catch (e) {
      alert("Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = trips.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.destinationCountry.toLowerCase().includes(search.toLowerCase())
  );

  const counts = STATUSES.slice(1).reduce<Record<string, number>>((acc, s) => {
    acc[s] = trips.filter((t) => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Map size={24} className="text-[#C9A227]" />
          Trips
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {trips.length} total
          {counts.READY > 0 && <span className="ml-2 text-purple-700 font-medium">• {counts.READY} awaiting approval</span>}
          {counts.ACTIVE > 0 && <span className="ml-2 text-green-700 font-medium">• {counts.ACTIVE} active</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-300 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or destination..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition border",
                statusFilter === s
                  ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] border-[#C9A227]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#C9A227]/50"
              )}
            >
              {s || "All"} {s && counts[s] ? `(${counts[s]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-700">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Plane size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600">No trips found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-800">
                <th className="px-4 py-3 font-semibold">Trip</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold">Budget</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => {
                const st = statusMeta[t.status] ?? statusMeta.DRAFT;
                const StIcon = st.icon;
                return (
                  <tr key={t.id} className="hover:bg-gray-100/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C9A227]/20 to-[#E6C55C]/20 flex items-center justify-center shrink-0">
                          <Plane size={16} className="text-[#8C6D1F]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{t.title}</p>
                          <p className="text-xs text-gray-600 truncate">
                            {t.traveler?.profile?.firstName ? `${t.traveler.profile.firstName} ${t.traveler.profile.lastName ?? ""}` : t.traveler?.email ?? "Traveler"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <MapPin size={13} className="text-[#C9A227]" />
                        {t.destinationCountry}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div>{fmtDate(t.startAt)}</div>
                      <div className="text-gray-700">→ {fmtDate(t.endAt)}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {egp(t.budgetMinor, t.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold", st.bg, st.color)}>
                        <StIcon size={12} />
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === "READY" && (
                          <>
                            <button
                              onClick={() => handleApprove(t.id)}
                              disabled={actionLoading}
                              className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-700 transition"
                              title="Approve (→ ACTIVE)"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => { setSelected(t); setShowReject(true); setRejectReason(""); }}
                              disabled={actionLoading}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition"
                              title="Reject (→ PLANNING)"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {t.status === "PLANNING" && (
                          <button
                            onClick={() => handleRequestReview(t.id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded hover:bg-purple-50 text-purple-600 hover:text-purple-700 transition"
                            title="Request review (→ READY)"
                          >
                            <Clock size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => loadDetail(t.id)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Detail Modal ===== */}
      {selected && !showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#C9A227]/30 shadow-[0_0_60px_rgba(201,162,39,0.25)]">
            <div className="flex items-center justify-between p-5 border-b border-gray-300 bg-gradient-to-r from-[#F0D78C]/20 to-transparent">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Map size={20} className="text-[#C9A227]" />
                {selected.title}
              </h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100 text-gray-700">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</p>
                  <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold mt-1", statusMeta[selected.status]?.bg, statusMeta[selected.status]?.color)}>
                    {selected.status}
                  </span>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Destination</p>
                  <p className="font-semibold text-gray-900 mt-1">{selected.destinationCountry}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Start</p>
                  <p className="font-semibold text-gray-900 mt-1">{fmtDate(selected.startAt)}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> End</p>
                  <p className="font-semibold text-gray-900 mt-1">{fmtDate(selected.endAt)}</p>
                </div>
                <div className="col-span-2 p-3 bg-gradient-to-br from-[#C9A227]/10 to-[#E6C55C]/10 rounded-lg border border-[#C9A227]/20">
                  <p className="text-[10px] font-semibold text-[#8C6D1F] uppercase tracking-wider flex items-center gap-1"><DollarSign size={10} /> Budget</p>
                  <p className="text-xl font-bold text-[#8C6D1F] mt-1">{egp(selected.budgetMinor, selected.currency)}</p>
                </div>
              </div>

              {/* Itinerary */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar size={14} className="text-[#C9A227]" />
                  Itinerary
                  <span className="text-xs font-normal text-gray-600">
                    ({selected.itineraries?.reduce((sum, it) => sum + it.items.length, 0) ?? 0} items)
                  </span>
                </h3>
                {(!selected.itineraries || selected.itineraries.length === 0) ? (
                  <p className="text-sm text-gray-700 italic">No itinerary planned yet</p>
                ) : (
                  <div className="space-y-3">
                    {selected.itineraries.map((it) => (
                      <div key={it.id} className="border border-gray-300 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-gray-100 text-xs font-semibold text-gray-600 flex items-center justify-between">
                          <span>Version {it.version}</span>
                          <span className="text-gray-700">{new Date(it.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {it.items.map((item, idx) => (
                            <div key={item.id} className="px-3 py-2 flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                                  <span className="uppercase tracking-wider text-[10px]">{item.type}</span>
                                  {item.startAt && <span>{new Date(item.startAt).toLocaleString()}</span>}
                                  {item.estimatedMinor != null && <span className="font-semibold text-[#8C6D1F]">{egp(item.estimatedMinor)}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selected.status === "READY" && (
              <div className="flex gap-2 p-4 border-t border-gray-300 bg-gray-100">
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <XCircle size={16} /> Reject
                </button>
                <button
                  onClick={() => handleApprove(selected.id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Reject Modal ===== */}
      {showReject && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-md border border-red-200 shadow-xl">
            <div className="p-5 border-b border-gray-300 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <XCircle size={20} className="text-red-600" />
                Reject Trip
              </h3>
              <button onClick={() => setShowReject(false)} className="p-1.5 rounded hover:bg-gray-100 text-gray-700">
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-3">
                Provide a reason for rejection. Trip will return to PLANNING status.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (min 5 chars)..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-300 bg-gray-100">
              <button
                onClick={() => setShowReject(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || rejectReason.trim().length < 5}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}