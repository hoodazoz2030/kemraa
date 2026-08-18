"use client";

import { useEffect, useState } from "react";
import { paymentsApi, type Payment } from "@/lib/api";
import { CreditCard, Banknote, Search, RefreshCw } from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await paymentsApi.adminList();
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = payments.filter((p) => {
    if (providerFilter !== "all" && p.provider !== providerFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [
        p.provider,
        p.providerPaymentId,
        p.status,
        p.booking?.traveler?.email,
        p.booking?.service?.name,
      ].join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  const formatAmount = (minor: number, currency: string) => {
    const major = minor / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(major);
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      CREATED: "bg-gray-100 text-gray-800",
      REQUIRES_ACTION: "bg-yellow-100 text-yellow-800",
      AUTHORIZED: "bg-blue-100 text-blue-800",
      CAPTURED: "bg-green-100 text-green-800",
      SETTLED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      VOIDED: "bg-gray-100 text-gray-800",
      REFUND_PENDING: "bg-orange-100 text-orange-800",
      REFUNDED: "bg-orange-100 text-orange-800",
      PARTIALLY_REFUNDED: "bg-orange-100 text-orange-800",
    };
    return map[s] ?? "bg-gray-100 text-gray-800";
  };

  const totalAmount = filtered.reduce((s, p) => p.status === "CAPTURED" || p.status === "SETTLED" ? s + p.amountMinor : s, 0);
  const captured = filtered.filter((p) => p.status === "CAPTURED" || p.status === "SETTLED").length;
  const failed = filtered.filter((p) => p.status === "FAILED").length;
  const pending = filtered.filter((p) => p.status === "CREATED" || p.status === "REQUIRES_ACTION").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor all transactions across Stripe and Fawry
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Total Transactions</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Captured</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{captured}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{pending}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(totalAmount, "EGP")}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-700 mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Reference, email, service..."
              className="w-full pl-9 pr-4 py-2 border rounded text-gray-900 text-sm"
            />
          </div>
        </div>
        <div className="min-w-[150px]">
          <label className="text-xs font-medium text-gray-700 mb-1 block">Provider</label>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded text-gray-900 text-sm"
          >
            <option value="all">All providers</option>
            <option value="STRIPE">Stripe</option>
            <option value="FAWRY">Fawry</option>
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded text-gray-900 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="CREATED">Created</option>
            <option value="CAPTURED">Captured</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
        <button
          onClick={() => { setSearch(""); setProviderFilter("all"); setStatusFilter("all"); }}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-600">Loading payments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-600">No payments found</div>
        ) : (
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {p.provider === "STRIPE" ? (
                        <CreditCard size={16} className="text-purple-600" />
                      ) : (
                        <Banknote size={16} className="text-orange-600" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">{p.provider}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-600">
                    {p.providerPaymentId ? p.providerPaymentId.slice(0, 12) + "..." : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {formatAmount(p.amountMinor, p.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {p.booking?.traveler?.email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {p.booking?.service?.name ? (
                      <div>
                        <div>{p.booking.service.name}</div>
                        <div className="text-xs text-gray-600">{p.booking.service.type}</div>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}