"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney, formatDate } from "@/lib/format";
import { useState } from "react";

const STATUSES = ["", "DRAFT", "PLANNING", "READY", "ACTIVE", "COMPLETED", "CANCELLED"];

export default function TripsPage() {
  const [status, setStatus] = useState("");
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips", status],
    queryFn: () =>
      api.get("/trips", { params: { limit: 100, ...(status ? { status } : {}) } }).then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "All statuses"}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Title</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Destination</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Dates</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Budget</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            )}
            {!isLoading && (trips as any[]).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No trips found</td></tr>
            )}
            {(trips as any[]).map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                <td className="px-4 py-3 text-gray-600">{t.destinationCountry}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(t.startAt)} → {formatDate(t.endAt)}</td>
                <td className="px-4 py-3 text-gray-600">{formatMoney(t.budgetMinor, t.currency)}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}