"use client";

import { useEffect, useState } from "react";
import { analyticsApi, type AnalyticsOverview } from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import {
  DollarSign, Calendar, Users, MessageSquare, TrendingUp,
  RefreshCw, Award,
} from "lucide-react";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E6C55C";
const GOLD_PALE = "#F0D78C";
const NIGHT = "#0C0A06";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const load = async () => {
    setLoading(true);
    try {
      const d = await analyticsApi.overview(days);
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  const egp = (minor: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(minor / 100);

  if (loading || !data) {
    return <div className="p-12 text-center text-gray-500">Loading analytics...</div>;
  }

  const statCards = [
    { label: "Revenue", value: egp(data.totals.revenue), icon: DollarSign, color: "from-[#C9A227] to-[#E6C55C]" },
    { label: "Bookings", value: data.totals.bookings.toLocaleString(), icon: Calendar, color: "from-[#0E7C86] to-[#14B8C4]" },
    { label: "Users", value: data.totals.users.toLocaleString(), icon: Users, color: "from-[#8C6D1F] to-[#C9A227]" },
    { label: "Support Tickets", value: data.totals.tickets.toLocaleString(), icon: MessageSquare, color: "from-[#B8860B] to-[#E6C55C]" },
  ];

  const statusColors: Record<string, string> = {
    PENDING: "#E6C55C",
    PAYMENT_PENDING: "#F59E0B",
    CONFIRMED: "#14B8A4",
    COMPLETED: "#10B981",
    CANCELLED: "#EF4444",
    FAILED: "#991B1B",
  };

  const providerColors: Record<string, string> = {
    STRIPE: "#635BFF",
    FAWRY: "#F97316",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={24} className="text-[#C9A227]" />
            Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time business intelligence — powered by Thoth</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                <Icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Revenue + Providers */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue trend */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.revenueByDay}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `${Math.round(v / 100)}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(v: any) => [egp(Number(v)), "Revenue"]}
              />
              <Area type="monotone" dataKey="total" stroke={GOLD} strokeWidth={2.5} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payments by provider (donut) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Payments by Provider</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.paymentsByProvider}
                dataKey="count"
                nameKey="provider"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
              >
                {data.paymentsByProvider.map((entry) => (
                  <Cell key={entry.provider} fill={providerColors[entry.provider] ?? "#C9A227"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(v: any, n: any, props: any) => [`${v} — ${egp(props.payload.total)}`, props.payload.provider]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Bookings by status + Top services */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bookings by status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Bookings by Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bookingsByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.bookingsByStatus.map((entry) => (
                  <Cell key={entry.status} fill={statusColors[entry.status] ?? "#9CA3AF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top services */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Award size={16} className="text-[#C9A227]" />
            Top Services
          </h3>
          {data.topServices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No services yet</p>
          ) : (
            <div className="space-y-2">
              {data.topServices.map((svc, idx) => {
                const max = data.topServices[0].revenue || 1;
                const pct = (svc.revenue / max) * 100;
                return (
                  <div key={svc.name} className="flex items-center gap-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{svc.name}</span>
                        <span className="text-xs text-gray-500 ml-2 shrink-0">{svc.count} bookings</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#C9A227] to-[#E6C55C] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-[#8C6D1F] font-semibold mt-1">{egp(svc.revenue)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}