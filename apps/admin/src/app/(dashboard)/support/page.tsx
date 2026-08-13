"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export default function SupportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => api.get("/support/tickets", { params: { limit: 100 } }).then((r) => r.data),
  });
  const { data: incidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => api.get("/support/incidents", { params: { limit: 100 } }).then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Support</h1>

      <h2 className="text-lg font-semibold text-gray-800 mb-3">Tickets</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Category</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Priority</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Reporter</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No tickets</td></tr>
            )}
            {(data?.items ?? []).map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.category}</td>
                <td className="px-4 py-3"><StatusBadge status={t.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-gray-600">{t.user?.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600"><span dir="ltr">{formatDate(t.createdAt)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-3">Incidents</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Severity</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Resolution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(incidents?.items ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No incidents</td></tr>
            )}
            {(incidents?.items ?? []).map((i: any) => (
              <tr key={i.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{i.type}</td>
                <td className="px-4 py-3"><StatusBadge status={i.severity} /></td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{i.resolution ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}