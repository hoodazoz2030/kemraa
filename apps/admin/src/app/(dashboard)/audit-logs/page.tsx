"use client";

import { useEffect, useState } from "react";
import { auditLogsApi, type AuditLog } from "@/lib/api";
import {
  ScrollText, Search, Filter, Loader2, Calendar, User,
  Clock, ChevronRight, X, Download, Activity,
} from "lucide-react";
import clsx from "clsx";

const ACTION_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  "user.login":         { bg: "bg-blue-100",    color: "text-blue-700",    icon: "🔐" },
  "auth.refresh":       { bg: "bg-blue-100",    color: "text-blue-700",    icon: "🔄" },
  "booking.submit":     { bg: "bg-amber-100",   color: "text-amber-700",   icon: "📤" },
  "booking.approve":    { bg: "bg-green-100",   color: "text-green-700",   icon: "✅" },
  "booking.reject":     { bg: "bg-red-100",     color: "text-red-700",     icon: "❌" },
  "booking.cancel":     { bg: "bg-red-100",     color: "text-red-700",     icon: "🚫" },
  "refund.create":      { bg: "bg-orange-100",  color: "text-orange-700",  icon: "💸" },
  "refund.process":     { bg: "bg-blue-100",    color: "text-blue-700",    icon: "⚙️" },
  "refund.succeed":     { bg: "bg-green-100",   color: "text-green-700",   icon: "✅" },
  "refund.fail":        { bg: "bg-red-100",     color: "text-red-700",     icon: "❌" },
  "commission.markPaid":        { bg: "bg-green-100", color: "text-green-700", icon: "💰" },
  "commission.markEligible":    { bg: "bg-blue-100",  color: "text-blue-700",  icon: "✓" },
  "commission.rule.create":     { bg: "bg-purple-100", color: "text-purple-700", icon: "📋" },
  "commission.rule.update":     { bg: "bg-purple-100", color: "text-purple-700", icon: "✏️" },
  "user.status.update": { bg: "bg-amber-100",   color: "text-amber-700",   icon: "🛡️" },
  "user.roles.update":  { bg: "bg-amber-100",   color: "text-amber-700",   icon: "👑" },
  "payment.create":     { bg: "bg-green-100",   color: "text-green-700",   icon: "💳" },
  "trip.create":        { bg: "bg-indigo-100",  color: "text-indigo-700",  icon: "🗺️" },
  "flag.update":        { bg: "bg-gray-100",    color: "text-gray-700",    icon: "🚩" },
  "search.reindex":     { bg: "bg-gray-100",    color: "text-gray-700",    icon: "🔍" },
};

const getStyle = (action: string) => ACTION_COLORS[action] ?? { bg: "bg-gray-100", color: "text-gray-700", icon: "📝" };

const fmt = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await auditLogsApi.list({
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setLogs(Array.isArray(res) ? res : (res.items ?? []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [actionFilter, resourceFilter, dateFrom, dateTo]);

  // Unique actions & resources for filters
  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const resources = Array.from(new Set(logs.map((l) => l.resourceType))).sort();

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.resourceType.toLowerCase().includes(q) ||
      (l.resourceId ?? "").toLowerCase().includes(q) ||
      (l.actor?.email ?? "").toLowerCase().includes(q) ||
      (l.ip ?? "").toLowerCase().includes(q)
    );
  });

  // Stats
  const today = logs.filter((l) => {
    const d = new Date(l.createdAt).toDateString();
    return d === new Date().toDateString();
  }).length;
  const uniqueActors = new Set(logs.map((l) => l.actorId).filter(Boolean)).size;

  // CSV export
  const exportCsv = () => {
    const headers = ["timestamp", "actor", "action", "resource_type", "resource_id", "ip", "metadata"];
    const rows = filtered.map((l) => [
      l.createdAt,
      l.actor?.email ?? l.actorId ?? "—",
      l.action,
      l.resourceType,
      l.resourceId ?? "—",
      l.ip ?? "—",
      JSON.stringify(l.metadata ?? {}),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText size={24} className="text-[#C9A227]" />
            Audit Logs
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {logs.length} events • {today} today • {uniqueActors} actors
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:border-[#C9A227]/50 flex items-center gap-2 disabled:opacity-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <Activity size={18} className="text-[#C9A227] mb-2" />
          <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
          <p className="text-xs text-gray-600 mt-1">Total events</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <Calendar size={18} className="text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{today}</p>
          <p className="text-xs text-gray-600 mt-1">Today</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <User size={18} className="text-green-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{uniqueActors}</p>
          <p className="text-xs text-gray-600 mt-1">Unique actors</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <Filter size={18} className="text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{actions.length}</p>
          <p className="text-xs text-gray-600 mt-1">Action types</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, action, resource ID, IP..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All actions ({actions.length})</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All resources ({resources.length})</option>
            {resources.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            placeholder="To" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          {(actionFilter || resourceFilter || dateFrom || dateTo) && (
            <button onClick={() => { setActionFilter(""); setResourceFilter(""); setDateFrom(""); setDateTo(""); }}
              className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" size={24} />Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><ScrollText size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-600">No audit events</p><p className="text-xs text-gray-500 mt-1">Try a booking approval or refund to generate events</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const style = getStyle(log.action);
              const actorName = log.actor
                ? (log.actorId?.slice(0, 8) ?? "System")
                : (log.actorId ? log.actorId.slice(0, 8) + "..." : "System");
              return (
                <button
                  key={log.id}
                  onClick={() => setSelected(log)}
                  className="w-full p-4 hover:bg-gray-50/70 transition text-left flex items-start gap-3"
                >
                  <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0", style.bg)}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold", style.bg, style.color)}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-gray-600 uppercase">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-[10px] text-gray-500 font-mono" dir="ltr">#{log.resourceId.slice(0, 8)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-[9px] flex items-center justify-center">
                          {actorName[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-medium">{actorName}</span>
                      </div>
                      {log.ip && <span className="text-gray-500">• {log.ip}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-900 font-medium">{fmt(log.createdAt)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{timeAgo(log.createdAt)}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0 mt-2" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-[#C9A227]/30 flex flex-col">
            <div className="p-5 border-b bg-gradient-to-r from-[#F0D78C]/30 to-transparent flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={clsx("w-12 h-12 rounded-lg flex items-center justify-center text-2xl", getStyle(selected.action).bg)}>
                  {getStyle(selected.action).icon}
                </div>
                <div>
                  <p className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold inline-block", getStyle(selected.action).bg, getStyle(selected.action).color)}>
                    {selected.action}
                  </p>
                  <h2 className="text-sm font-bold text-gray-900 mt-1">{selected.resourceType}</h2>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100"><X size={18} className="text-gray-600" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Timestamp</p>
                  <p className="text-xs text-gray-900 mt-1 font-mono" dir="ltr">{selected.createdAt}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{timeAgo(selected.createdAt)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actor</p>
                  <p className="text-xs text-gray-900 mt-1">{selected.actorId?.slice(0, 8) ?? "System"}</p>
                  {selected.actorId && <p className="text-[10px] text-gray-500 mt-0.5 font-mono" dir="ltr">{selected.actorId.slice(0, 12)}...</p>}
                </div>
              </div>
              {selected.resourceId && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Resource ID</p>
                  <p className="text-xs text-gray-900 mt-1 font-mono break-all" dir="ltr">{selected.resourceId}</p>
                </div>
              )}
              {selected.ip && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">IP Address</p>
                  <p className="text-xs text-gray-900 mt-1 font-mono">{selected.ip}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Metadata</p>
                <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-auto max-h-96" dir="ltr">
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}