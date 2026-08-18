"use client";

import { useEffect, useState } from "react";
import { supportApi, type SupportTicket, type SupportReply } from "@/lib/api";
import {
  HelpCircle, AlertCircle, Clock, CheckCircle2, XCircle,
  Loader2, Send, ChevronRight, MessageSquare, Flame, Zap,
  Tag, User, UserCog,
} from "lucide-react";
import clsx from "clsx";

const statusMeta: Record<string, { color: string; bg: string; icon: any }> = {
  OPEN:        { color: "text-amber-700",  bg: "bg-amber-100",  icon: AlertCircle },
  IN_PROGRESS: { color: "text-blue-700",   bg: "bg-blue-100",   icon: Clock },
  WAITING:     { color: "text-purple-700", bg: "bg-purple-100", icon: Clock },
  RESOLVED:    { color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  CLOSED:      { color: "text-gray-700",   bg: "bg-gray-100",   icon: XCircle },
};

const priorityMeta: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  LOW:    { color: "text-gray-600",   bg: "bg-gray-100",   icon: Tag, label: "Low" },
  MEDIUM: { color: "text-blue-600",   bg: "bg-blue-100",   icon: Tag, label: "Medium" },
  HIGH:   { color: "text-orange-600", bg: "bg-orange-100", icon: Flame, label: "High" },
  URGENT: { color: "text-red-600",    bg: "bg-red-100",    icon: Zap, label: "Urgent" },
};

const statuses = ["ALL", "OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];
const priorities = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (priorityFilter !== "ALL") params.priority = priorityFilter;
      const data = await supportApi.adminList(params);
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const t = await supportApi.adminDetail(id);
      setSelected(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => { loadList(); }, [statusFilter, priorityFilter]);

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await supportApi.adminReply(selected.id, replyText.trim());
      setReplyText("");
      await loadDetail(selected.id);
      await loadList();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    await supportApi.adminUpdate(selected.id, { status });
    setSelected({ ...selected, status });
    await loadList();
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selected) return;
    await supportApi.adminUpdate(selected.id, { priority });
    setSelected({ ...selected, priority });
    await loadList();
  };

  const openCount = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle size={24} className="text-[#C9A227]" />
          Support Tickets
          {openCount > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]">
              {openCount} open
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-600 mt-1">Manage customer inquiries and resolve issues</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Status</label>
          <div className="flex flex-wrap gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  "px-3 py-1 rounded-full text-xs font-medium transition border",
                  statusFilter === s
                    ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] border-[#C9A227]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#C9A227]/50"
                )}
              >
                {s === "ALL" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Priority</label>
          <div className="flex flex-wrap gap-1">
            {priorities.map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={clsx(
                  "px-3 py-1 rounded-full text-xs font-medium transition border",
                  priorityFilter === p
                    ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] border-[#C9A227]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#C9A227]/50"
                )}
              >
                {p === "ALL" ? "All" : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-12 gap-4">
        {/* Ticket list */}
        <div className="col-span-5 bg-white rounded-xl border border-gray-300 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {tickets.length} tickets
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-700">
              <Loader2 className="animate-spin mx-auto" size={20} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-700 text-sm">No tickets match filters</div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {tickets.map((t) => {
                const StatusIcon = statusMeta[t.status]?.icon ?? AlertCircle;
                const PrIcon = priorityMeta[t.priority]?.icon ?? Tag;
                const isSelected = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => loadDetail(t.id)}
                    className={clsx(
                      "w-full text-left px-4 py-3 hover:bg-[#C9A227]/5 transition",
                      isSelected && "bg-[#C9A227]/10 border-l-4 border-l-[#C9A227]"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <PrIcon size={14} className={clsx(priorityMeta[t.priority]?.color, "mt-0.5 shrink-0")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                        <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                          <span>{t.customerName ?? t.user.email}</span>
                          <span>•</span>
                          <span>{t.category}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={clsx("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", statusMeta[t.status]?.bg, statusMeta[t.status]?.color)}>
                            <StatusIcon size={10} />
                            {t.status.replace("_", " ")}
                          </span>
                          {t._count && t._count.replies > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-600">
                              <MessageSquare size={10} />
                              {t._count.replies}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Ticket detail */}
        <div className="col-span-7 bg-white rounded-xl border border-gray-300 overflow-hidden">
          {!selected ? (
            <div className="p-12 text-center text-gray-700">
              <HelpCircle size={40} className="mx-auto mb-3 text-[#C9A227]/40" />
              <p className="text-sm">Select a ticket to view details</p>
            </div>
          ) : loadingDetail ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto" size={24} />
            </div>
          ) : (
            <div className="flex flex-col h-[700px]">
              {/* Detail header */}
              <div className="p-5 border-b bg-gradient-to-r from-[#F0D78C]/20 to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">{selected.subject}</h2>
                    <p className="text-xs text-gray-600 mt-1">
                      Ticket #{selected.id.slice(0, 8)} • {selected.category} • Opened {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {/* Controls */}
                <div className="flex flex-wrap gap-3 mt-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={selected.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-3 py-1.5 text-xs border rounded-lg bg-white text-gray-900"
                    >
                      {Object.keys(statusMeta).map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Priority</label>
                    <select
                      value={selected.priority}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="px-3 py-1.5 text-xs border rounded-lg bg-white text-gray-900"
                    >
                      {Object.keys(priorityMeta).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Customer</label>
                    <div className="px-3 py-1.5 text-xs border rounded-lg bg-gray-100 text-gray-700 flex items-center gap-1">
                      <User size={12} />
                      {selected.user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/50">
                {/* Original ticket body */}
                <div className="bg-white rounded-lg border border-gray-300 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-gray-600" />
                    <span className="text-xs font-semibold text-gray-700">
                      {selected.user.email}
                    </span>
                    <span className="text-[10px] text-gray-700 ml-auto">
                      {new Date(selected.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.body}</p>
                </div>

                {/* Replies */}
                {(selected.replies ?? []).map((r) => (
                  <div
                    key={r.id}
                    className={clsx(
                      "rounded-lg border p-4",
                      r.isStaff
                        ? "bg-gradient-to-br from-[#F0D78C]/30 to-[#C9A227]/10 border-[#C9A227]/40 ml-6"
                        : "bg-white border-gray-300 mr-6"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {r.isStaff ? <UserCog size={14} className="text-[#8C6D1F]" /> : <User size={14} className="text-gray-600" />}
                      <span className={clsx("text-xs font-semibold", r.isStaff ? "text-[#8C6D1F]" : "text-gray-700")}>
                        {r.isStaff ? "Staff" : r.author.email}
                      </span>
                      <span className="text-[10px] text-gray-700 ml-auto">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.body}</p>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply as staff..."
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]/30 resize-none"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="px-4 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}