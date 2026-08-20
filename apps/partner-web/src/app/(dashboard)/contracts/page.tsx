"use client";
import { useQuery } from "@tanstack/react-query";
import { partnerContractsApi, api } from "@/lib/api";
import { FileSignature, Download, Clock, CheckCircle } from "lucide-react";
import Cookies from "js-cookie";

const ST: any = {
  DRAFT: { color: "bg-blue-500/10 text-blue-400", label: "Draft" },
  SENT: { color: "bg-yellow-500/10 text-yellow-400", label: "Sent" },
  VIEWED: { color: "bg-cyan-500/10 text-cyan-400", label: "Viewed" },
  SIGNED: { color: "bg-green-500/10 text-green-400", label: "Signed" },
  COMPLETED: { color: "bg-emerald-500/10 text-emerald-400", label: "Completed" },
  EXPIRED: { color: "bg-red-500/10 text-red-400", label: "Expired" },
};

async function downloadPdf(id: string) {
  const token = Cookies.get("access_token");
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/api/v1"}/partner-contracts/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `contract-${id.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ContractsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["contracts"], queryFn: () => partnerContractsApi.list() });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Contracts</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Partnership agreements and signing requests (§11)</p>
      </div>

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading contracts...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No contracts yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((c: any) => {
            const st = ST[c.status] ?? ST.DRAFT;
            return (
              <div key={c.id} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6 hover:border-kemraa-goldDark/40 transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center"><FileSignature size={22} className="text-kemraa-dark" /></div>
                  <span className={`px-2.5 py-1 rounded text-[10px] tracking-wider ${st.color}`}>{st.label}</span>
                </div>
                <div className="text-sm text-kemraa-text/50 mb-1">{c.contractType}</div>
                <div className="text-kemraa-text font-semibold mb-1">{c.signerName ?? "—"}</div>
                <div className="text-xs text-kemraa-text/50 mb-4">{c.signerEmail} · {c.signerTitle ?? ""}</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-kemraa-text/60 mb-4">
                  <div>Created: {new Date(c.createdAt).toLocaleDateString()}</div>
                  <div>Expires: {new Date(c.expiresAt).toLocaleDateString()}</div>
                  {c.signedAt && <div className="col-span-2 text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Signed: {new Date(c.signedAt).toLocaleDateString()}</div>}
                </div>
                <button onClick={() => downloadPdf(c.id).catch(() => alert("Download failed"))} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-kemraa-goldDark/40 text-kemraa-gold hover:bg-kemraa-goldDark/10 transition text-sm">
                  <Download size={14} /> Download PDF
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}