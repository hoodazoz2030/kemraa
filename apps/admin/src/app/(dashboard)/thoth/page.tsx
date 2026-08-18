"use client";
import { useEffect, useState } from "react";
import { opsApi } from "@/lib/api";
import { Sparkles, Loader2, Check, X, ShieldAlert } from "lucide-react";
import clsx from "clsx";

const riskColor = (r: string) => ({
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
}[r] ?? "bg-gray-200 text-gray-800");

export default function ThothPage() {
  const [tab, setTab] = useState<"tools" | "approvals">("tools");
  const [tools, setTools] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([opsApi.listTools(), opsApi.listActions()]);
      setTools(t); setActions(a);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, enabled: boolean) => { await opsApi.updateTool(id, { enabled }); await load(); };
  const toggleApproval = async (id: string, requiresApproval: boolean) => { await opsApi.updateTool(id, { requiresApproval }); await load(); };
  const simulate = async () => {
    const tool = tools.find((t) => t.requiresApproval && t.enabled);
    if (!tool) { alert("No approval-requiring tool available"); return; }
    await opsApi.simulateAction(tool.name, { simulated: true });
    await load();
  };
  const decide = async (id: string, approve: boolean) => {
    if (approve) await opsApi.approveAction(id); else await opsApi.rejectAction(id);
    await load();
  };

  const pending = actions.filter((a) => a.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={24} className="text-[#C9A227]" /> THOTH Control
          </h1>
          <p className="text-sm text-gray-700 mt-1">Tools allow-list, risk levels, approval gates</p>
        </div>
        <button onClick={simulate} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold text-sm">
          Simulate HIGH action
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-300">
        <div className="border-b border-gray-300 flex">
          {(["tools", "approvals"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx("px-4 py-3 text-sm font-semibold capitalize", tab === t ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-gray-700")}>
              {t === "tools" ? `Tools (${tools.length})` : `Approvals (${pending.length} pending)`}
            </button>
          ))}
        </div>

        <div className="p-4">
          {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" size={24} /></div>
          : tab === "tools" ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-800">
                <tr><th className="px-3 py-2">Tool</th><th className="px-3 py-2">Risk</th><th className="px-3 py-2">Approval</th><th className="px-3 py-2">Enabled</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tools.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2">
                      <p className="font-mono font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-700">{t.description}</p>
                    </td>
                    <td className="px-3 py-2"><span className={clsx("px-2 py-0.5 rounded text-xs font-bold", riskColor(t.riskLevel))}>{t.riskLevel}</span></td>
                    <td className="px-3 py-2">
                      <button onClick={() => toggleApproval(t.id, !t.requiresApproval)}
                        className={clsx("px-2 py-1 rounded text-xs font-semibold", t.requiresApproval ? "bg-orange-100 text-orange-800" : "bg-gray-200 text-gray-700")}>
                        {t.requiresApproval ? "Required" : "Off"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => toggle(t.id, !t.enabled)}
                        className={clsx("px-2 py-1 rounded text-xs font-bold", t.enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                        {t.enabled ? "ON" : "OFF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-3">
              {actions.length === 0 ? <p className="text-center text-gray-700 py-8">No THOTH actions yet. Use "Simulate HIGH action" to test the gate.</p>
              : actions.map((a) => (
                <div key={a.id} className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-semibold text-gray-900">{a.toolName}</p>
                    <p className="text-xs text-gray-700">{new Date(a.createdAt).toLocaleString()} - <span className={clsx("px-1.5 py-0.5 rounded font-bold", riskColor(a.riskLevel))}>{a.riskLevel}</span></p>
                    <pre className="text-xs font-mono text-gray-700 mt-1 max-h-16 overflow-auto">{JSON.stringify(a.payload)}</pre>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "PENDING" ? (
                      <>
                        <button onClick={() => decide(a.id, true)} className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white" title="Approve"><Check size={16} /></button>
                        <button onClick={() => decide(a.id, false)} className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white" title="Reject"><X size={16} /></button>
                      </>
                    ) : (
                      <span className={clsx("px-2 py-1 rounded text-xs font-bold", a.status === "APPROVED" ? "bg-green-100 text-green-800" : a.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-gray-200 text-gray-800")}>{a.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
        <ShieldAlert size={16} className="shrink-0" />
        THOTH never executes HIGH/CRITICAL tools without an approval gate. Disabled tools are removed from the allow-list at runtime.
      </div>
    </div>
  );
}
