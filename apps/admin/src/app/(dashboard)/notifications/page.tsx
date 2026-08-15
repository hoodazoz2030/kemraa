"use client";

import { useEffect, useState } from "react";
import { notificationsApi, type Notification } from "@/lib/api";
import { Bell, Check, CheckCheck, DollarSign, Calendar, Settings, Megaphone, MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import clsx from "clsx";

const typeMeta: Record<string, { icon: any; color: string; bg: string }> = {
  PAYMENT: { icon: DollarSign, color: "text-green-700", bg: "bg-green-100" },
  BOOKING: { icon: Calendar, color: "text-[#0E7C86]", bg: "bg-cyan-100" },
  SYSTEM: { icon: Settings, color: "text-gray-700", bg: "bg-gray-100" },
  MARKETING: { icon: Megaphone, color: "text-purple-700", bg: "bg-purple-100" },
  SUPPORT: { icon: MessageSquare, color: "text-orange-700", bg: "bg-orange-100" },
};

const filters = [
  { key: "", label: "All" },
  { key: "__unread", label: "Unread" },
  { key: "PAYMENT", label: "Payments" },
  { key: "BOOKING", label: "Bookings" },
  { key: "SYSTEM", label: "System" },
  { key: "MARKETING", label: "Marketing" },
  { key: "SUPPORT", label: "Support" },
];

function timeAgo(date: string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === "__unread") params.unreadOnly = true;
      else if (filter) params.type = filter;
      const res = await notificationsApi.list(params);
      setItems(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  };

  const handleMarkAll = async () => {
    setMarking(true);
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={24} className="text-[#C9A227]" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Stay updated on your kingdom's activity</p>
        </div>
        <button
          onClick={handleMarkAll}
          disabled={marking || unreadCount === 0}
          className="px-4 py-2 text-sm bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg hover:brightness-110 disabled:opacity-50 flex items-center gap-2 font-semibold"
        >
          {marking ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
          Mark all as read
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              "px-4 py-1.5 rounded-full text-sm font-medium transition border",
              filter === f.key
                ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] border-[#C9A227] shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:border-[#C9A227]/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#C9A227]/20 to-[#E6C55C]/20 flex items-center justify-center mb-3">
              <AlertCircle size={28} className="text-[#C9A227]" />
            </div>
            <p className="text-gray-500">No notifications{filter === "__unread" ? " unread" : ""}</p>
            <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          items.map((n) => {
            const meta = typeMeta[n.type] ?? { icon: Bell, color: "text-gray-700", bg: "bg-gray-100" };
            const Icon = meta.icon;
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                className={clsx(
                  "px-5 py-4 flex items-start gap-4 hover:bg-[#C9A227]/5 transition cursor-pointer relative",
                  isUnread && "bg-[#F0D78C]/10"
                )}
                onClick={() => isUnread && handleMarkRead(n.id)}
              >
                {isUnread && (
                  <div className="absolute top-5 left-2 w-1.5 h-1.5 rounded-full bg-[#C9A227] shadow-[0_0_6px_#C9A227]" />
                )}
                <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", meta.bg)}>
                  <Icon size={20} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={clsx("text-sm", isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {timeAgo(n.sentAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600">
                      {n.type}
                    </span>
                    {isUnread && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        className="text-xs text-[#8C6D1F] hover:text-[#C9A227] flex items-center gap-1 font-medium"
                      >
                        <Check size={12} /> Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}