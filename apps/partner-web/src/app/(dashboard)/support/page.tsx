"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerSupportApi } from "@/lib/api";
import { Plus, X, Loader2, HelpCircle, MessageCircle, Inbox } from "lucide-react";

const PRIORITIES = ["LOW","MEDIUM","HIGH","URGENT"];
const CATS = ["GENERAL","BOOKING","FINANCE","TECHNICAL","CONTRACT"];
const ST_COLOR: any = {
  OPEN: "bg-blue-500/10 text-blue-400",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400",
  WAITING_REPLY: "bg-orange-500/10 text-orange-400",
  RESOLVED: "bg-green-500/10 text-green-400",
  CLOSED: "bg-gray-500/10 text-gray-400",
};

export default function SupportPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "GENERAL", subject: "", body: "", priority: "MEDIUM" });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["support"], queryFn: () => partnerSupportApi.list() });
  const createMut = useMutation({
    mutationFn: (d: any) => partnerSupportApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["support"] }); setShowForm(false); setForm({ category: "GENERAL", subject: "", body: "", priority: "MEDIUM" }); setError(""); },
    onError: (e: any) => setError(e?.response?.data?.message || "Failed to create ticket"),
  });

  const items = data?.items ?? [];

  const submit = (e: React.FormEvent) => { e.preventDefault(); createMut.mutate(form); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Support</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Get help from KEMRAA team (§16)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold hover:brightness-110 transition">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? "Cancel" : "New Ticket"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">CATEGORY</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text focus:outline-none focus:border-kemraa-gold">
                {CATS.map((c) => <option key={c} value={c} className="bg-kemraa-dark">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">PRIORITY</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text focus:outline-none focus:border-kemraa-gold">
                {PRIORITIES.map((p) => <option key={p} value={p} className="bg-kemraa-dark">{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">SUBJECT</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="Brief description of your issue" className="w-full px-3 py-2.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
          </div>
          <div>
            <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">DESCRIPTION</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required rows={4} placeholder="Provide details..." className="w-full px-3 py-2.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
          </div>
          {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
          <button type="submit" disabled={createMut.isPending} className="px-6 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
            {createMut.isPending && <Loader2 className="animate-spin" size={16} />} Submit Ticket
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading tickets...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">
          <Inbox size={48} className="mx-auto text-kemraa-text/30 mb-3" />
          No tickets yet. Click &quot;New Ticket&quot; to get help.
        </div>
      ) : (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kemraa-goldDark/20 text-left">
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">SUBJECT</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">CATEGORY</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">PRIORITY</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">STATUS</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">REPLIES</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">CREATED</th>
            </tr></thead>
            <tbody>
              {items.map((t: any) => (
                <tr key={t.id} className="border-b border-kemraa-goldDark/10 last:border-0 hover:bg-white/5 transition">
                  <td className="px-5 py-4"><Link href={`/support/${t.id}`} className="text-kemraa-gold hover:underline font-medium">{t.subject}</Link></td>
                  <td className="px-5 py-4 text-kemraa-text/70 text-xs">{t.category}</td>
                  <td className="px-5 py-4 text-kemraa-text/70 text-xs">{t.priority}</td>
                  <td className="px-5 py-4"><span className={`px-2 py-1 rounded text-[10px] tracking-wider ${ST_COLOR[t.status] ?? "bg-gray-500/10 text-gray-400"}`}>{t.status}</span></td>
                  <td className="px-5 py-4 text-kemraa-text/60 text-xs">{t._count?.replies ?? 0}</td>
                  <td className="px-5 py-4 text-kemraa-text/60 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}