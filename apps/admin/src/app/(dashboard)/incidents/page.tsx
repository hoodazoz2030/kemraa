"use client";
import { useEffect, useState } from "react";
import { incidentsApi } from "@/lib/api";
import { AlertTriangle, Loader2, Plus, X, Save } from "lucide-react";
import clsx from "clsx";

const TYPES = ["SAFETY", "FRAUD", "PAYMENT_DISPUTE", "SERVICE_FAILURE", "CANCELLATION", "COMPLAINT", "TECHNICAL", "OTHER"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const severityColor = (s: string) => ({
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
}[s] ?? "bg-gray-200 text-gray-800");

const statusColor = (s: string) => ({
  OPEN: "bg-red-100 text-red-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-200 text-gray-800",
}[s] ?? "bg-gray-200 text-gray-800");

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", severity: "", type: "" });
  const [createModal, setCreateModal] = useState(false);
  const [resolveModal, setResolveModal] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: "COMPLAINT", severity: "MEDIUM" });
  const [resolution, setResolution] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [items, s] = await Promise.all([incidentsApi.list(filter), incidentsApi.stats()]);
      setIncidents(items.items); setStats(s);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter.status, filter.severity, filter.type]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await incidentsApi.create(form); setCreateModal(false); await load(); }
    catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const transition = async (id: string, newStatus: string, resolutionText?: string) => {
    setBusy(true);
    try {
      await incidentsApi.updateStatus(id, newStatus, resolutionText);
      setResolveModal(null); setResolution("");
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const nextStatuses = (current: string): string[] => {
    const map: Record<string, string[]> = {
      OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
      IN_PROGRESS: ["RESOLVED", "CLOSED"],
      RESOLVED: ["CLOSED", "IN_PROGRESS"],
      CLOSED: [],
    };
    return map[current] ?? [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={24} className="text-[#C9A227]" /> Incidents
          </h1>
          <p className="text-sm text-gray-700 mt-1">Support incidents, safety, fraud, service failures</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold flex items-center gap-2">
          <Plus size={18} /> New Incident
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Open", value: stats.open, color: "text-red-700" },
            { label: "In Progress", value: stats.inProgress, color: "text-yellow-700" },
            { label: "Resolved", value: stats.resolved, color: "text-green-700" },
            { label: "Closed", value: stats.closed, color: "text-gray-700" },
            { label: "Total", value: stats.total, color: "text-gray-900" },
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-300">
              <p className="text-xs text-gray-700 uppercase tracking-wider">{s.label}</p>
              <p className={clsx("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-300 p-4 flex gap-3">
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All Status</option>
          <option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option>
        </select>
        <select value={filter.severity} onChange={(e) => setFilter({ ...filter, severity: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All Severities</option>
          {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        : incidents.length === 0 ? <div className="p-12 text-center text-gray-700"><AlertTriangle size={40} className="mx-auto mb-3 text-gray-400" />No incidents</div>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {incidents.map((i) => (
                <tr key={i.id} className="hover:bg-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{i.type}</td>
                  <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded text-xs font-bold", severityColor(i.severity))}>{i.severity}</span></td>
                  <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded text-xs font-bold", statusColor(i.status))}>{i.status}</span></td>
                  <td className="px-4 py-3 text-gray-700">{i.trip?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{new Date(i.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {nextStatuses(i.status).length > 0 && (
                      <button onClick={() => { setResolveModal(i); setResolution(""); }} className="px-3 py-1 rounded-lg bg-gray-800 text-white text-xs font-semibold">
                        Transition
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">New Incident</h3>
              <button onClick={() => setCreateModal(false)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800"><X size={18} /></button>
            </div>
            <form onSubmit={create} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Severity</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" disabled={busy} className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-bold disabled:opacity-50">
                {busy ? "Creating..." : "Create Incident"}
              </button>
            </form>
          </div>
        </div>
      )}

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Transition Incident</h3>
              <button onClick={() => setResolveModal(null)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-700 mb-3">Current: <span className="font-bold">{resolveModal.status}</span></p>
            <p className="text-sm text-gray-700 mb-4">Available transitions:</p>
            <div className="space-y-2">
              {nextStatuses(resolveModal.status).map((s) => (
                <button key={s} onClick={() => {
                  if (["RESOLVED", "CLOSED"].includes(s)) {
                    const res = prompt(`Resolution note for ${s}:`);
                    if (res !== null) transition(resolveModal.id, s, res);
                  } else {
                    transition(resolveModal.id, s);
                  }
                }} className="w-full py-2 rounded-lg border border-gray-300 hover:bg-gray-100 font-semibold">
                  → {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
