"use client";
import { useEffect, useState } from "react";
import { signingApi, type SigningRequest, partnersApi, type Partner } from "@/lib/api";
import { FileSignature, Loader2, Send, X, Mail, Copy, Check, Ban, Plus, Eye } from "lucide-react";
import clsx from "clsx";

export default function SigningPage() {
  const [requests, setRequests] = useState<SigningRequest[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", partnerId: "" });
  const [createModal, setCreateModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ partnerId: "", signerEmail: "", signerName: "", signerTitle: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        partnersApi.list({ limit: 200 }),
        signingApi.stats(),
      ]);
      setPartners(p.items);
      setStats(s);

      // Load requests from first partner or filtered
      const targetPartner = filter.partnerId || (p.items[0]?.id ?? "");
      if (targetPartner) {
        const reqs = await signingApi.listByPartner(targetPartner);
        setRequests(reqs);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter.partnerId]);

  const statusColor = (s: string) => {
    switch (s) {
      case "DRAFT": return "bg-gray-100 text-gray-700";
      case "SENT": return "bg-blue-100 text-blue-700";
      case "VIEWED": return "bg-yellow-100 text-yellow-700";
      case "SIGNED":
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      case "EXPIRED": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signingApi.create(form);
      setCreateModal(false);
      setForm({ partnerId: "", signerEmail: "", signerName: "", signerTitle: "" });
      await load();
    } catch (e: any) {
      alert("Failed: " + (e?.response?.data?.message || e?.message || e));
    } finally { setBusy(false); }
  };

  const send = async (id: string) => {
    if (!confirm("Send this signing request via email?")) return;
    try {
      const result = await signingApi.send(id);
      alert(`Sent! URL: ${result.signingUrl}`);
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || e?.message); }
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this signing request?")) return;
    await signingApi.cancel(id);
    await load();
  };

  const selectedPartner = partners.find((p) => p.id === filter.partnerId) || partners[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature size={24} className="text-[#C9A227]" /> Contract Signing
          </h1>
          <p className="text-sm text-gray-500 mt-1">DocuSign-style electronic signatures</p>
        </div>
        <button onClick={() => setCreateModal(true)} disabled={!partners.length}
          className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
          <Plus size={18} /> New Signing Request
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-gray-900" },
            { label: "Draft", value: stats.draft, color: "text-gray-600" },
            { label: "Sent", value: stats.sent, color: "text-blue-600" },
            { label: "Viewed", value: stats.viewed, color: "text-yellow-600" },
            { label: "Signed", value: stats.signed, color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className={clsx("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <select value={filter.partnerId} onChange={(e) => setFilter({ ...filter, partnerId: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          <option value="">All Partners</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileSignature size={40} className="mx-auto mb-3 text-gray-300" />
            No signing requests for this partner
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-left text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">Signer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.signerEmail}</p>
                    <p className="text-xs text-gray-500">{r.signerName ?? "—"} {r.signerTitle ? `(${r.signerTitle})` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold", statusColor(r.status))}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.sentAt && <div>Sent: {new Date(r.sentAt).toLocaleString()}</div>}
                    {r.viewedAt && <div>Viewed: {new Date(r.viewedAt).toLocaleString()}</div>}
                    {r.signedAt && <div className="text-green-700 font-semibold">Signed: {new Date(r.signedAt).toLocaleString()}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(r.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "DRAFT" && (
                        <button onClick={() => send(r.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Send">
                          <Send size={15} />
                        </button>
                      )}
                      <button onClick={() => copyLink(r.signingToken)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Copy URL">
                        {copied === r.signingToken ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                      </button>
                      {["DRAFT", "SENT", "VIEWED"].includes(r.status) && (
                        <button onClick={() => cancel(r.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Cancel">
                          <Ban size={15} />
                        </button>
                      )}
                      <a href={`/sign/${r.signingToken}`} target="_blank"
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Preview">
                        <Eye size={15} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">New Signing Request</h3>
              <button onClick={() => setCreateModal(false)} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Partner</label>
                <select value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })} required
                  className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="">Select...</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Signer Email *</label>
                <input type="email" value={form.signerEmail} onChange={(e) => setForm({ ...form, signerEmail: e.target.value })} required
                  className="w-full px-3 py-2 border rounded-lg" placeholder="signer@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Signer Name</label>
                  <input value={form.signerName} onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Title</label>
                  <input value={form.signerTitle} onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" placeholder="CEO" />
                </div>
              </div>
              <button type="submit" disabled={busy}
                className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Create Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
