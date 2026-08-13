"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney, formatDate } from "@/lib/format";

export default function BookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get("/bookings", { params: { limit: 100 } }).then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Service</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Items</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Created</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            )}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No bookings</td></tr>
            )}
            {(data?.items ?? []).map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{b.service?.title ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{b.items?.length ?? 0}</td>
                <td className="px-4 py-3 text-gray-600">{formatMoney(b.totalMinor, b.currency)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(b.createdAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}