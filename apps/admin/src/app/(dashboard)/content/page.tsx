"use client";
import { useEffect, useState } from "react";
import { opsApi } from "@/lib/api";
import { Newspaper, Loader2, Plus, X, Check, Archive, Trash2 } from "lucide-react";
import clsx from "clsx";

const TYPES = ["DESTINATION_GUIDE", "OFFER", "ANNOUNCEMENT", "PAGE"];

export default function ContentPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "", status: "" });
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: "DESTINATION_GUIDE", title: "", body: "", locale: "ar-EG" });

  const load = async () => {
    setLoading(true);
    try {
      const r = await opsApi.listContent(filter);
      setItems(r.items); setTotal(r.total);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter.type, filter.status]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await opsApi.createContent(form); setModal(false); setForm({ type: "DESTINATION_GUIDE", title: "", body: "", locale: "ar-EG" }); await load(); }
    catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const publish = async (id: string) => { await opsApi.updateContent(id, { status: "PUBLISHED" }); await load(); };
  const archive = async (id: string) => { await opsApi.updateContent(id, { status: "ARCHIVED" }); await load(); };
  const remove = async (id: string) => { if (confirm("Delete this content?")) { await opsApi.deleteContent(id); await load(); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper size={24} className="text-[#C9A227]" /> Content
          </h1>
          <p className="text-sm text-gray-700 mt-1">{total} items - guides, offers, announcements</p>
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold flex items-center gap-2">
          <Plus size={18} /> New Content
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 p-4 flex gap-3">
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">All Status</option>
          <option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-700"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        : items.length === 0 ? <div className="p-12 text-center text-gray-700"><Newspaper size={40} className="mx-auto mb-3 text-gray-400" />No content yet</div>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Locale</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.title}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-800">{c.type}</span></td>
                  <td className="px-4 py-3 text-gray-700">{c.locale}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold",
                      c.status === "PUBLISHED" ? "bg-green-100 text-green-800" : c.status === "DRAFT" ? "bg-yellow-100 text-yellow-800" : "bg-gray-200 text-gray-700")}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {c.status !== "PUBLISHED" && <button onClick={() => publish(c.id)} className="p-1.5 rounded hover:bg-green-100 text-green-700" title="Publish"><Check size={15} /></button>}
                      {c.status === "PUBLISHED" && <button onClick={() => archive(c.id)} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Archive"><Archive size={15} /></button>}
                      <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-red-100 text-red-700" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">New Content</h3>
              <button onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800"><X size={18} /></button>
            </div>
            <form onSubmit={create} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="ar-EG">Arabic (ar-EG)</option>
                  <option value="en">English</option>
                </select>
              </div>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} placeholder="Body (markdown supported)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              <button type="submit" disabled={busy} className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50">
                {busy ? "Saving..." : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
