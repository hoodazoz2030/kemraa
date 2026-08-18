"use client";
import { useEffect, useState } from "react";
import { opsApi } from "@/lib/api";
import { Layers, Loader2, RefreshCw } from "lucide-react";
import clsx from "clsx";

export default function QueuesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await opsApi.queues()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers size={24} className="text-[#C9A227]" /> Queues &amp; DLQ
          </h1>
          <p className="text-sm text-gray-700 mt-1">Workers health, dead-letter monitoring</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white" title="Refresh">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        </button>
      </div>

      {data && (
        <>
          <div className={clsx("p-4 rounded-xl border font-semibold text-sm flex items-center gap-2",
            data.redis.status === "up" ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800")}>
            Redis: {data.redis.status.toUpperCase()} - {data.redis.url}
          </div>

          <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
                <tr><th className="px-4 py-3">Queue</th><th className="px-4 py-3">Waiting</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Failed</th><th className="px-4 py-3">DLQ</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.queues.map((q: any) => (
                  <tr key={q.name}>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{q.name}</td>
                    <td className="px-4 py-3 text-gray-700">{q.waiting}</td>
                    <td className="px-4 py-3 text-gray-700">{q.active}</td>
                    <td className="px-4 py-3 text-green-700">{q.completed}</td>
                    <td className={clsx("px-4 py-3 font-semibold", q.failed > 0 ? "text-red-700" : "text-gray-700")}>{q.failed}</td>
                    <td className={clsx("px-4 py-3 font-semibold", q.dlq > 0 ? "text-red-700" : "text-gray-700")}>{q.dlq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-300 p-4">
            <h3 className="font-bold text-gray-900 mb-2">Dead-Letter Queue</h3>
            {data.dlq.length === 0
              ? <p className="text-sm text-gray-700">DLQ is empty. Failed jobs will land here for manual retry.</p>
              : <pre className="text-xs font-mono text-gray-900 overflow-auto">{JSON.stringify(data.dlq, null, 2)}</pre>}
            <p className="text-xs text-gray-700 mt-3">{data.note}</p>
          </div>
        </>
      )}
    </div>
  );
}
