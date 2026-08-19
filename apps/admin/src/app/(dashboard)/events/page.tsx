"use client";
import { useEffect, useState } from "react";
import { eventsApi } from "@/lib/api";
import { Zap, Loader2, Send, Activity } from "lucide-react";
import clsx from "clsx";

export default function EventsPage() {
  const [catalog, setCatalog] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [testUserId, setTestUserId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cat, st] = await Promise.all([eventsApi.catalog(), eventsApi.stats()]);
      setCatalog(cat);
      setStats(st);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const emitTest = async () => {
    if (!selectedEvent || !testUserId) {
      alert("Select event type and user ID");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await eventsApi.emit(selectedEvent, { test: true, timestamp: new Date().toISOString() }, testUserId);
      setResult(r);
      setTimeout(load, 1000); // Refresh stats
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap size={24} className="text-[#C9A227]" /> Events &amp; Notifications
        </h1>
        <p className="text-sm text-gray-700 mt-1">
          Event catalog, BullMQ workers, notification channels
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" size={32} /></div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-300">
                <p className="text-xs text-gray-700 uppercase font-bold">Event Types</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{catalog?.count ?? 0}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-300">
                <p className="text-xs text-gray-700 uppercase font-bold">Events Queue</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.events?.waiting ?? 0}</p>
                <p className="text-xs text-gray-600">waiting</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-300">
                <p className="text-xs text-gray-700 uppercase font-bold">Notifications Queue</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{stats.notifications?.waiting ?? 0}</p>
                <p className="text-xs text-gray-600">waiting</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-300">
                <p className="text-xs text-green-900 uppercase font-bold">Completed</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {(stats.events?.completed ?? 0) + (stats.notifications?.completed ?? 0)}
                </p>
              </div>
            </div>
          )}

          {/* Test Event Emitter */}
          <div className="bg-white p-6 rounded-xl border border-gray-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Send size={20} /> Test Event Emitter
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Event Type</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Select event...</option>
                  {catalog?.eventTypes?.map((t: string) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">User ID</label>
                <input
                  type="text"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  placeholder="UUID of user to notify"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={emitTest}
              disabled={busy || !selectedEvent || !testUserId}
              className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Emit Test Event
            </button>
            {result && (
              <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                <p className="text-sm font-bold text-green-800">Event emitted!</p>
                <p className="text-xs text-green-700 mt-1 font-mono">{result.eventId}</p>
              </div>
            )}
          </div>

          {/* Event Catalog */}
          <div className="bg-white p-6 rounded-xl border border-gray-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} /> Event Catalog ({catalog?.count ?? 0} types)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {catalog?.eventTypes?.map((t: string) => (
                <div key={t} className="p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-800">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
