"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { locationsApi, usersApi, type LiveLocation, type UserDetail } from "@/lib/api";
import {
  MapPin, RefreshCw, Loader2, Clock, Users, Radio, Battery,
  X, Mail, Phone, Calendar, Map as MapIcon, ChevronRight,
  Zap, Wifi, Activity,
} from "lucide-react";
import clsx from "clsx";

const LeafletMap = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />,
});

const timeWindows = [
  { key: 5, label: "5m" },
  { key: 15, label: "15m" },
  { key: 30, label: "30m" },
  { key: 60, label: "1h" },
  { key: 1440, label: "24h" },
];

const fmtTime = (d: string) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return Math.round(diff) + "s ago";
  if (diff < 3600) return Math.round(diff / 60) + "m ago";
  if (diff < 86400) return Math.round(diff / 3600) + "h ago";
  return Math.round(diff / 86400) + "d ago";
};

export default function UsersMapPage() {
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMinutes, setActiveMinutes] = useState(60);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selected, setSelected] = useState<LiveLocation | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await locationsApi.list(activeMinutes);
      setLocations(data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMinutes]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => load(true), 30_000);
    return () => clearInterval(t);
  }, [load, autoRefresh]);

  const openUserDetail = async (loc: LiveLocation) => {
    setSelected(loc);
    setLoadingDetail(true);
    try {
      const u = await usersApi.getDetail(loc.userId);
      setUserDetail(u);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const activeCount = locations.length;
  const highAccuracy = locations.filter((l) => l.accuracy && l.accuracy < 20).length;
  const avgBattery = locations.reduce((sum, l) => sum + (l.battery ?? 0), 0) / (locations.length || 1);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={24} className="text-[#C9A227]" />
            Live Location Map
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time user tracking across Egypt
            {lastUpdate && (
              <span className="ml-2 text-xs text-gray-400">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={clsx(
              "px-3 py-2 text-xs rounded-lg font-semibold flex items-center gap-1.5 border transition",
              autoRefresh
                ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] border-[#C9A227]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#C9A227]/50"
            )}
          >
            <Activity size={13} className={autoRefresh ? "animate-pulse" : ""} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:border-[#C9A227]/50 flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2">
            <Users size={16} className="text-[#C9A227]" />
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{activeCount}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2">
            <Zap size={16} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-500">High accuracy</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{highAccuracy}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2">
            <Battery size={16} className={avgBattery > 50 ? "text-green-600" : avgBattery > 20 ? "text-amber-600" : "text-red-600"} />
            <div>
              <p className="text-xs text-gray-500">Avg battery</p>
              <p className="text-lg font-bold text-gray-900 leading-none">
                {locations.length > 0 ? Math.round(avgBattery) + "%" : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <Clock size={14} className="text-gray-400 ml-2" />
          {timeWindows.map((tw) => (
            <button
              key={tw.key}
              onClick={() => setActiveMinutes(tw.key)}
              className={clsx(
                "px-3 py-1 rounded text-xs font-semibold transition",
                activeMinutes === tw.key
                  ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden relative">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-[#C9A227]" size={32} />
            </div>
          ) : (
            <LeafletMap locations={locations} onSelect={openUserDetail} activeMinutes={activeMinutes} />
          )}

          {locations.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
              <div className="text-center">
                <MapIcon size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No active users in the last {activeMinutes} minutes</p>
                <p className="text-xs text-gray-400 mt-1">Try increasing the time window</p>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div className="w-96 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-[#F0D78C]/30 to-transparent border-b flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-base flex items-center justify-center shrink-0 ring-2 ring-[#C9A227]/50">
                  {selected.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{selected.displayName}</h3>
                  <p className="text-xs text-gray-500 truncate" dir="ltr">
                    {selected.user.email ?? selected.user.phone ?? "—"}
                  </p>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setUserDetail(null); }} className="p-1 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#C9A227]" size={24} />
              </div>
            ) : userDetail ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="p-3 bg-gradient-to-br from-[#C9A227]/10 to-[#E6C55C]/10 border border-[#C9A227]/20 rounded-lg">
                  <p className="text-[10px] font-semibold text-[#8C6D1F] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MapPin size={10} /> Current Location
                  </p>
                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>Coordinates</span>
                      <span className="font-mono text-[11px]" dir="ltr">
                        {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                      </span>
                    </div>
                    {selected.accuracy && (
                      <div className="flex justify-between">
                        <span>Accuracy</span>
                        <span>±{Math.round(selected.accuracy)}m</span>
                      </div>
                    )}
                    {selected.source && (
                      <div className="flex justify-between">
                        <span>Source</span>
                        <span className="flex items-center gap-1">
                          <Wifi size={10} /> {selected.source}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Last update</span>
                      <span>{fmtTime(selected.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <MapIcon size={14} className="mx-auto text-[#C9A227]" />
                    <p className="text-sm font-bold text-gray-900 mt-1">{userDetail._count.trips}</p>
                    <p className="text-[9px] text-gray-500 uppercase">Trips</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <Calendar size={14} className="mx-auto text-[#C9A227]" />
                    <p className="text-sm font-bold text-gray-900 mt-1">{userDetail._count.bookings}</p>
                    <p className="text-[9px] text-gray-500 uppercase">Bookings</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <Radio size={14} className="mx-auto text-[#C9A227]" />
                    <p className="text-sm font-bold text-gray-900 mt-1">{userDetail._count.tickets}</p>
                    <p className="text-[9px] text-gray-500 uppercase">Tickets</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={12} /> <span dir="ltr">{userDetail.email ?? "—"}</span>
                  </div>
                  {userDetail.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={12} /> <span dir="ltr">{userDetail.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={12} /> <span>Joined {new Date(userDetail.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {userDetail.trips.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Trips</p>
                    <div className="space-y-1.5">
                      {userDetail.trips.slice(0, 3).map((t: any) => (
                        <div key={t.id} className="p-2 bg-gray-50 rounded-lg flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-900 truncate">{t.title}</p>
                            <p className="text-[10px] text-gray-500">{t.destinationCountry}</p>
                          </div>
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0",
                            t.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                          )}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <a
                  href="/users"
                  className="block text-center py-2 mt-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg text-xs font-semibold hover:brightness-110 flex items-center justify-center gap-1"
                >
                  View full profile <ChevronRight size={12} />
                </a>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}