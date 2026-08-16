"use client";

import { useEffect, useState } from "react";
import { bookingsApi, type Booking } from "@/lib/api";
import {
  Calendar, Search, Loader2, Eye, CheckCircle2, XCircle, X,
  AlertTriangle, CreditCard, User, ShoppingBag, Map, Clock,
  CheckCheck, Ban, Receipt,
} from "lucide-react";
import clsx from "clsx";

const STATUSES = ["", "DRAFT", "PENDING_APPROVAL", "PAYMENT_PENDING", "CONFIRMING", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED", "CANCEL_REQUESTED", "DISPUTED", "FAILED"];

const statusMeta: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:            { color: "text-gray-700",   bg: "bg-gray-100",   label: "Draft" },
  PENDING_APPROVAL: { color: "text-amber-700",  bg: "bg-amber-100",  label: "Pending Approval" },
  PAYMENT_PENDING:  { color: "text-orange-700", bg: "bg-orange-100", label: "Payment Pending" },
  CONFIRMING:       { color: "text-blue-700",   bg: "bg-blue-100",   label: "Confirming" },
  CONFIRMED:        { color: "text-green-700",  bg: "bg-green-100",  label: "Confirmed" },
  COMPLETED:        { color: "text-teal-700",   bg: "bg-teal-100",   label: "Completed" },
  REJECTED:         { color: "text-red-700",    bg: "bg-red-100",    label: "Rejected" },
  FAILED:           { color: "text-red-700",    bg: "bg-red-100",    label: "Failed" },
  CANCEL_REQUESTED: { color: "text-amber-700",  bg: "bg-amber-100",  label: "Cancel Requested" },
  CANCELLED:        { color: "text-gray-700",   bg: "bg-gray-200",   label: "Cancelled" },
  DISPUTED:         { color: "text-red-700",    bg: "bg-red-100",    label: "Disputed" },
};

const egp = (minor: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list({ status: statusFilter || undefined });
      const items = Array.isArray(res) ? res : (res.items ?? []);
      setBookings(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setSelected({ id } as Booking);
    try {
      const b = await bookingsApi.get(id);
      setSelected(b);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const runAction = async (id: string, action: "approve" | "confirm" | "complete") => {
    setActionLoading(action);
    try {
      if (action === "approve") await bookingsApi.approve(id);
      if (action === "confirm") await bookingsApi.confirm(id);
      if (action === "complete") await bookingsApi.complete(id);
      await load();
      if (selected?.id === id) await openDetail(id);
    } catch (e) {
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selected || rejectReason.trim().length < 5) return;
    setActionLoading("reject");
    try {
      await bookingsApi.reject(selected.id, rejectReason.trim());
      setRejectModal(false);
      setRejectReason("");
      await load();
      await openDetail(selected.id);
    } catch (e) {
      alert("Reject failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    if (!confirm("Cancel this booking?")) return;
    setActionLoading("cancel");
    try {
      await bookingsApi.cancel(selected.id, "Cancelled by admin");
      await load();
      await openDetail(selected.id);
    } catch (e) {
      alert("Cancel failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = bookings.filter((b) =>
    !search ||
    (b.service?.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (b.traveler?.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const counts: Record<string, number> = {};
  bookings.forEach((b) => { counts[b.status] = (counts[b.status] ?? 0) + 1; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={24} className="text-[#C9A227]" />
          Bookings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {bookings.length} total
          {counts.PENDING_APPROVAL > 0 && <span className="ml-2 text-amber-700 font-medium">• {counts.PENDING_APPROVAL} awaiting approval</span>}
          {counts.CONFIRMING > 0 && <span className="ml-2 text-blue-700 font-medium">• {counts.CONFIRMING} confirming</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by service or traveler..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === "" ? "All statuses" : `${statusMeta[s]?.label ?? s}${counts[s] ? ` (${counts[s]})` : ""}`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Traveler</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((b) => {
                const st = statusMeta[b.status] ?? statusMeta.DRAFT;
                return (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C9A227]/20 to-[#E6C55C]/20 flex items-center justify-center shrink-0">
                          <ShoppingBag size={16} className="text-[#8C6D1F]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{b.service?.title ?? "Booking"}</p>
                          <p className="text-xs text-gray-500">{b.service?.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs" dir="ltr">
                      {b.traveler?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.items?.length ?? 0}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{egp(b.totalMinor, b.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap", st.bg, st.color)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {b.status === "PENDING_APPROVAL" && (
                          <>
                            <button
                              onClick={() => runAction(b.id, "approve")}
                              disabled={actionLoading !== null}
                              className="p-1.5 rounded hover:bg-green-50 text-green-600 transition"
                              title="Approve (→ Payment Pending)"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => { setSelected(b); setRejectModal(true); setRejectReason(""); }}
                              disabled={actionLoading !== null}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600 transition"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {b.status === "CONFIRMING" && (
                          <button
                            onClick={() => runAction(b.id, "confirm")}
                            disabled={actionLoading !== null}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition"
                            title="Confirm booking"
                          >
                            <CheckCheck size={15} />
                          </button>
                        )}
                        {b.status === "CONFIRMED" && (
                          <button
                            onClick={() => runAction(b.id, "complete")}
                            disabled={actionLoading !== null}
                            className="p-1.5 rounded hover:bg-teal-50 text-teal-600 transition"
                            title="Mark completed"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        {["DRAFT", "PENDING_APPROVAL", "PAYMENT_PENDING", "CONFIRMING", "CONFIRMED", "CANCEL_REQUESTED"].includes(b.status) && (
                          <button
                            onClick={() => { setSelected(b); handleCancel(); }}
                            disabled={actionLoading !== null}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition"
                            title="Cancel booking"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => openDetail(b.id)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition"
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

      {/* ===== Detail Drawer ===== */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-[#C9A227]/30 flex flex-col">
            <div className="p-5 border-b bg-gradient-to-r from-[#F0D78C]/30 to-transparent flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{selected.service?.title ?? "Booking"}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  #{selected.id.slice(0, 8)} • {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#C9A227]" size={24} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Status + total */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</p>
                    <span className={clsx("inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-1", statusMeta[selected.status]?.bg, statusMeta[selected.status]?.color)}>
                      {statusMeta[selected.status]?.label ?? selected.status}
                    </span>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-[#C9A227]/10 to-[#E6C55C]/10 rounded-lg border border-[#C9A227]/20">
                    <p className="text-[10px] font-semibold text-[#8C6D1F] uppercase tracking-wider flex items-center gap-1"><Receipt size={10} /> Total</p>
                    <p className="text-xl font-bold text-[#8C6D1F] mt-1">{egp(selected.totalMinor, selected.currency)}</p>
                  </div>
                </div>

                {/* Traveler */}
                {selected.traveler && (
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-sm flex items-center justify-center">
                      {(selected.traveler.profile?.firstName?.[0] ?? selected.traveler.email?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {[selected.traveler.profile?.firstName, selected.traveler.profile?.lastName].filter(Boolean).join(" ") || "Traveler"}
                      </p>
                      <p className="text-xs text-gray-500" dir="ltr">{selected.traveler.email}</p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                  <div className="space-y-2">
                    {(selected.items ?? []).map((item) => (
                      <div key={item.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 shrink-0">
                          {egp(item.unitMinor * item.quantity + item.taxMinor + item.feeMinor, selected.currency)}
                        </p>
                      </div>
                    ))}
                    {(selected.items ?? []).length === 0 && <p className="text-sm text-gray-400 italic">No items</p>}
                  </div>
                </div>

                {/* Payments */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CreditCard size={10} /> Payments
                  </p>
                  <div className="space-y-2">
                    {(selected.payments ?? []).map((p: any) => (
                      <div key={p.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.provider} • {p.methodType}</p>
                          <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{egp(p.amountMinor, p.currency)}</p>
                          <span className={clsx("inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold", p.status === "CAPTURED" || p.status === "SETTLED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(selected.payments ?? []).length === 0 && <p className="text-sm text-gray-400 italic">No payments yet</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Action bar */}
            {!loadingDetail && (
              <div className="p-4 border-t bg-gray-50 flex gap-2">
                {selected.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      onClick={() => runAction(selected.id, "approve")}
                      disabled={actionLoading !== null}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button
                      onClick={() => { setRejectModal(true); setRejectReason(""); }}
                      disabled={actionLoading !== null}
                      className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </>
                )}
                {selected.status === "CONFIRMING" && (
                  <button
                    onClick={() => runAction(selected.id, "confirm")}
                    disabled={actionLoading !== null}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCheck size={16} /> Confirm Booking
                  </button>
                )}
                {selected.status === "CONFIRMED" && (
                  <button
                    onClick={() => runAction(selected.id, "complete")}
                    disabled={actionLoading !== null}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Mark Completed
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== Reject Modal ===== */}
      {rejectModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-red-200 shadow-xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <XCircle size={20} className="text-red-600" />
                Reject Booking
              </h3>
              <button onClick={() => setRejectModal(false)} className="p-1.5 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (min 5 chars)..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <button onClick={() => setRejectModal(false)} className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading !== null || rejectReason.trim().length < 5}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}