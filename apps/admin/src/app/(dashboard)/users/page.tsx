"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { Shield, User as UserIcon } from "lucide-react";

export default function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users", { params: { limit: 100 } }).then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-700">User</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Roles</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Organization</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Activity</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No users</td></tr>
            )}
            {(data?.items ?? []).map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserIcon size={16} className="text-blue-600" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "—"}
                      </div>
                      {u.mfaEnabled && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Shield size={12} /> MFA enabled
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600" dir="ltr">{u.email ?? u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {[...new Set<string>(u.roles ?? [])].map((r: string) => (
                      <span key={r} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">{r}</span>
                    ))}
                    {(!u.roles || u.roles.length === 0) && <span className="text-gray-400 text-xs">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.organization ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="text-xs">
                    <div>{u.tripsCount} trips</div>
                    <div>{u.bookingsCount} bookings</div>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3 text-gray-600"><span dir="ltr">{formatDate(u.createdAt)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}