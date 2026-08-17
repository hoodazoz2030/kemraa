"use client";

import { useEffect, useState } from "react";
import { analyticsApi, paymentsApi, type AnalyticsOverview, type Payment } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { DollarSign, Calendar, Users, MessageSquare, CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [displayName, setDisplayName] = useState("Admin");
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("kemraa_user") || "null");
      const n = [u?.profile?.firstName, u?.profile?.lastName].filter(Boolean).join(" ") || u?.username;
      if (n) setDisplayName(n);
    } catch {}
  }, []);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    analyticsApi.overview(14).then(setOverview).catch(console.error);
    paymentsApi.adminList().then(setPayments).catch(console.error);
  }, []);

  const egp = (minor: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(minor / 100);

  const stats = [
    { label: "Revenue", value: overview ? egp(overview.totals.revenue) : "—", icon: DollarSign, grad: "from-[#C9A227] to-[#E6C55C]" },
    { label: "Bookings", value: overview?.totals.bookings ?? "—", icon: Calendar, grad: "from-[#0E7C86] to-[#14B8C4]" },
    { label: "Users", value: overview?.totals.users ?? "—", icon: Users, grad: "from-[#8C6D1F] to-[#C9A227]" },
    { label: "Tickets", value: overview?.totals.tickets ?? "—", icon: MessageSquare, grad: "from-[#B8860B] to-[#E6C55C]" },
  ];

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      CAPTURED: "bg-green-100 text-green-800",
      SETTLED: "bg-green-100 text-green-800",
      CREATED: "bg-gray-100 text-gray-700",
      PAYMENT_PENDING: "bg-amber-100 text-amber-800",
      FAILED: "bg-red-100 text-red-700",
      REFUNDED: "bg-orange-100 text-orange-700",
    };
    return map[s] ?? "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      {/* ===== Golden welcome banner ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C0A06] via-[#1a1206] to-[#241806] p-8 shadow-xl">
        <div
          className="absolute inset-y-0 right-0 w-3/5 opacity-25 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: "url('/login-bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0A06] via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-[11px] tracking-[0.35em] uppercase text-[#C9A227]/80">The Land of the Sun</p>
          <h1 className="mt-2 text-3xl font-bold bg-gradient-to-r from-[#F0D78C] to-[#C9A227] bg-clip-text text-transparent">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 text-sm text-[#d8c9a0]/80 max-w-lg">
            Monitor your kingdom — bookings, revenue, and travelers across Egypt. Powered by Thoth.
          </p>
        </div>
      </div>

      {/* ===== Stat cards ===== */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, grad }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#C9A227]/40 transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center shadow-md`}>
                <Icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Revenue sparkline + Recent payments ===== */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue sparkline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Revenue — last 14 days</h3>
            <Link href="/analytics" className="text-xs text-[#8C6D1F] hover:text-[#C9A227] flex items-center gap-1">
              Analytics <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={overview?.revenueByDay ?? []}>
              <defs>
                <linearGradient id="homeGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A227" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(v: any) => [egp(Number(v)), "Revenue"]}
              />
              <Area type="monotone" dataKey="total" stroke="#C9A227" strokeWidth={2.5} fill="url(#homeGold)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent payments */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CreditCard size={16} className="text-[#C9A227]" />
              Recent Payments
            </h3>
            <Link href="/payments" className="text-xs text-[#8C6D1F] hover:text-[#C9A227] flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No payments yet</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 text-sm font-medium text-gray-900">{p.provider}</td>
                    <td className="py-3 pr-4 text-sm font-semibold text-gray-900">{egp(p.amountMinor)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}