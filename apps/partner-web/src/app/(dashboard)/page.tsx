"use client";
import { useAuth } from "@/contexts/AuthContext";
import { partnerFinanceApi, partnerAnalyticsApi, partnerBookingsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Calendar, DollarSign, Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";

const PERIODS = [
  { key: "day", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

function formatMinor(minor: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100);
}

function KpiCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-5 hover:border-kemraa-goldDark/40 transition">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center">
          <Icon size={20} className="text-kemraa-dark" />
        </div>
      </div>
      <div className={`text-2xl font-bold ${color || "text-kemraa-gold"}`}>{value}</div>
      <div className="text-xs text-kemraa-text/60 tracking-wider mt-1 uppercase">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("month");

  const finance = useQuery({
    queryKey: ["finance-summary", period],
    queryFn: () => partnerFinanceApi.summary(period),
  });

  const analytics = useQuery({
    queryKey: ["analytics-overview", period],
    queryFn: () => partnerAnalyticsApi.overview(period),
  });

  const bookings = useQuery({
    queryKey: ["bookings-list"],
    queryFn: () => partnerBookingsApi.list(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">
            Welcome back{user?.organization?.displayName ? `, ${user.organization.displayName}` : ""}
          </h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Here&apos;s what&apos;s happening with your business</p>
        </div>
        <div className="flex gap-2 bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-md text-sm transition ${
                period === p.key
                  ? "bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark font-semibold"
                  : "text-kemraa-text/70 hover:text-kemraa-gold"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Gross Revenue" value={finance.isLoading ? "—" : `EGP ${formatMinor(finance.data?.gross?.minor ?? 0)}`} />
        <KpiCard icon={TrendingUp} label="KEMRAA Commission" value={finance.isLoading ? "—" : `EGP ${formatMinor(finance.data?.commission?.minor ?? 0)}`} color="text-kemraa-text" />
        <KpiCard icon={Activity} label="Net Payout" value={finance.isLoading ? "—" : `EGP ${formatMinor(finance.data?.net?.minor ?? 0)}`} color="text-green-400" />
        <KpiCard icon={Calendar} label="Bookings" value={analytics.isLoading ? "—" : analytics.data?.counts?.total ?? 0} color="text-kemraa-gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-kemraa-gold mb-4 tracking-wider">Booking Status</h2>
          {analytics.isLoading ? (
            <div className="text-kemraa-text/60">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatusRow icon={Clock} label="New" value={analytics.data?.counts?.new ?? 0} color="text-blue-400" />
              <StatusRow icon={CheckCircle} label="Confirmed" value={analytics.data?.counts?.confirmed ?? 0} color="text-green-400" />
              <StatusRow icon={CheckCircle} label="Completed" value={analytics.data?.counts?.completed ?? 0} color="text-emerald-400" />
              <StatusRow icon={XCircle} label="Cancelled" value={analytics.data?.counts?.cancelled ?? 0} color="text-red-400" />
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-kemraa-gold mb-4 tracking-wider">Recent Bookings</h2>
          {bookings.isLoading ? (
            <div className="text-kemraa-text/60">Loading...</div>
          ) : bookings.data?.items?.length === 0 ? (
            <div className="text-kemraa-text/60 py-8 text-center">No bookings yet</div>
          ) : (
            <div className="space-y-2">
              {(bookings.data?.items ?? []).slice(0, 5).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-kemraa-goldDark/10 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-kemraa-text font-mono truncate">{b.id.slice(0, 8)}</div>
                    <div className="text-xs text-kemraa-text/50">{new Date(b.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm text-kemraa-gold font-semibold">{b.currency} {formatMinor(b.totalMinor)}</div>
                    <div className={`text-[10px] uppercase tracking-wider ${statusColor(b.status)}`}>{b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
      <Icon size={18} className={color} />
      <div className="flex-1">
        <div className="text-xs text-kemraa-text/60 uppercase tracking-wider">{label}</div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  const s = status?.toUpperCase();
  if (["COMPLETED"].includes(s)) return "text-emerald-400";
  if (["CONFIRMED", "CONFIRMING"].includes(s)) return "text-green-400";
  if (["CANCELLED", "CANCEL_REQUESTED", "REJECTED", "FAILED"].includes(s)) return "text-red-400";
  if (["DRAFT", "PENDING_APPROVAL", "PAYMENT_PENDING"].includes(s)) return "text-blue-400";
  return "text-kemraa-text/60";
}
