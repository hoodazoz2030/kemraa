"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, type AuditLog } from "@/lib/api";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 25;

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs({
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
        limit,
        offset: page * limit,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, actionFilter, resourceFilter]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ar-EG", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  const actionColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("create") || a.includes("login")) return "bg-green-100 text-green-800";
    if (a.includes("update") || a.includes("approve")) return "bg-blue-100 text-blue-800";
    if (a.includes("delete") || a.includes("cancel")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} total events recorded in the system
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-gray-700">Action</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="e.g. AUTH_LOGIN, trip.create"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-gray-700">Resource Type</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="e.g. user, trip, booking"
            value={resourceFilter}
            onChange={(e) => { setResourceFilter(e.target.value); setPage(0); }}
          />
        </div>
        <button
          onClick={() => { setActionFilter(""); setResourceFilter(""); setPage(0); }}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No audit logs found</div>
        ) : (
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Time</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Action</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Resource</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.resourceType}
                      {log.resourceId && <span className="text-gray-400 text-xs mr-1"> #{log.resourceId.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono text-xs">
                      {log.actorId ? log.actorId.slice(0, 8) + "..." : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                      {log.ip || "—"}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Metadata:</div>
                        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto" dir="ltr">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-3 flex items-center justify-between border-t">
            <div className="text-sm text-gray-600">
              Page {page + 1} of {Math.ceil(total / limit)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}