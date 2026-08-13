"use client";

import { useEffect, useState } from "react";
import { featureFlagsApi, type FeatureFlag } from "@/lib/api";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await featureFlagsApi.list();
      setFlags(data);
    } catch (e: any) {
      showToast("error", "Failed to load flags: " + (e.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleFlag = async (key: string, currentEnabled: boolean) => {
    setUpdating(key);
    try {
      await featureFlagsApi.set(key, !currentEnabled);
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !currentEnabled, updatedAt: new Date().toISOString() } : f)));
      showToast("success", key + " " + (!currentEnabled ? "enabled" : "disabled"));
    } catch (e: any) {
      showToast("error", "Failed to update " + key + ": " + (e.message || "Unknown"));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = flags.filter((f) => f.key.toLowerCase().includes(search.toLowerCase()));

  const enabledCount = flags.filter((f) => f.enabled).length;
  const totalCount = flags.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control feature availability across the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-green-600">{enabledCount}</span>
            <span className="text-gray-400"> / {totalCount}</span> enabled
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border p-4">
        <input
          type="text"
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded text-gray-900"
        />
      </div>

      {/* Flags table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading && flags.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Loading flags...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search ? "No flags match your search" : "No feature flags found"}
          </div>
        ) : (
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Flag Key</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((flag) => (
                <tr key={flag.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm font-medium text-gray-900">{flag.key}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        flag.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {flag.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(flag.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleFlag(flag.key, flag.enabled)}
                      disabled={updating === flag.key}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        flag.enabled ? "bg-blue-600" : "bg-gray-300"
                      } ${updating === flag.key ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          flag.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}