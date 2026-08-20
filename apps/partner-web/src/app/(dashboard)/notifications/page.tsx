"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerNotificationsApi } from "@/lib/api";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => partnerNotificationsApi.list() });
  const readMut = useMutation({ mutationFn: (id: string) => partnerNotificationsApi.markRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const readAllMut = useMutation({ mutationFn: () => partnerNotificationsApi.markAllRead(), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });

  const items = data?.items ?? [];
  const unread = items.filter((n: any) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Notifications</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">{unread > 0 ? `${unread} unread` : "All caught up!"}</p>
        </div>
        {unread > 0 && (
          <button onClick={() => readAllMut.mutate()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-kemraa-goldDark/40 text-kemraa-gold hover:bg-kemraa-goldDark/10 transition text-sm">
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading notifications...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">
          <Inbox size={48} className="mx-auto text-kemraa-text/30 mb-3" />
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n: any) => (
            <div key={n.id} className={`bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border rounded-xl p-5 transition ${n.readAt ? "border-kemraa-goldDark/20 opacity-70" : "border-kemraa-gold/40"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${n.readAt ? "bg-white/5" : "bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold"}`}>
                  <Bell size={18} className={n.readAt ? "text-kemraa-text/50" : "text-kemraa-dark"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className={`font-semibold ${n.readAt ? "text-kemraa-text/80" : "text-kemraa-gold"}`}>{n.title}</div>
                    <div className="text-xs text-kemraa-text/50 flex-shrink-0">{new Date(n.sentAt || n.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-kemraa-goldDark mb-2 uppercase tracking-wider">{n.type} · {n.channel}</div>
                  <div className="text-sm text-kemraa-text/70">{n.body}</div>
                </div>
                {!n.readAt && (
                  <button onClick={() => readMut.mutate(n.id)} title="Mark as read" className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition">
                    <Check size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}