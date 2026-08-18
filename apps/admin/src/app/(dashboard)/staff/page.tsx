"use client";

import { useEffect, useState } from "react";
import { staffApi, type StaffMember, ALL_FEATURES } from "@/lib/api";
import { Users, Plus, Shield, Loader2, X, Save, RefreshCw, Eye, EyeOff, Trash2, Search, Check, UserX, UserCheck } from "lucide-react";
import clsx from "clsx";

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", features: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setStaff(await staffApi.list()); } catch (e: any) {
      if (e?.response?.status === 401) { window.location.href = "/login"; }
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setSelected(null);
    setForm({ fullName: "", email: "", features: ["dashboard", "bookings", "notifications", "support"] });
    setError(""); setModal("create");
  };

  const openEdit = (s: StaffMember) => {
    setSelected(s);
    const name = [s.profile?.firstName, s.profile?.lastName].filter(Boolean).join(" ");
    setForm({ fullName: name, email: s.email ?? "", features: (s.features as any) ?? [] });
    setError(""); setModal("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (modal === "create") {
        const r = await staffApi.create({ fullName: form.fullName, features: form.features });
        alert(`✅ Staff created!\n\nAccess Code: ${r.accessCode}\n\n⚠️ Share this code securely — it is the only way they can log in.`);
      } else if (selected) {
        await staffApi.update(selected.id, form);
      }
      setModal(null);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error?.message || "Failed to create staff";
      setError(msg);
    } finally { setBusy(false); }
  };

  const toggleFeature = (key: string) => {
    setForm((f) => ({
      ...f,
      features: f.features.includes(key) ? f.features.filter((k) => k !== key) : [...f.features, key],
    }));
  };

  const handleRegen = async (s: StaffMember) => {
    if (!confirm(`Regenerate code for "${s.profile?.firstName || s.email || "staff"}"?\n\nThe old code will stop working immediately.`)) return;
    setRefreshing(s.id);
    try {
      const newCode = await staffApi.regenerateCode(s.id);
      alert(`✅ New access code:\n\n${newCode}\n\n⚠️ Previous sessions will be signed out.`);
      await load();
    } catch (e) { alert("Failed to regenerate"); }
    finally { setRefreshing(null); }
  };

  const handleToggleLock = async (s: StaffMember) => {
    const suspending = s.status === "ACTIVE";
    if (suspending && !confirm(`Suspend ${s.profile?.firstName || s.email || "staff"}?`)) return;
    try {
      if (suspending) await staffApi.suspend(s.id);
      else await staffApi.reactivate(s.id);
      await load();
    } catch (e) { alert("Failed"); }
  };

  const handleDelete = async (s: StaffMember) => {
    if (!confirm(`DELETE ${s.profile?.firstName || s.email || "staff"}? This suspends them permanently.`)) return;
    try { await staffApi.delete(s.id); await load(); } catch (e) { alert("Failed"); }
  };

  const filtered = staff.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = [s.profile?.firstName, s.profile?.lastName].filter(Boolean).join(" ").toLowerCase();
    return name.includes(q) || (s.email ?? "").toLowerCase().includes(q) || (s.accessCode ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-[#C9A227]" /> Staff Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">{staff.length} staff • Each has a unique access code</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 flex items-center gap-2">
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or code..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" size={24} />Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><Users size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-600">No staff members</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">Access Code</th>
                <th className="px-4 py-3 font-semibold">Features</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => {
                const isSuspended = s.status !== "ACTIVE";
                const isOwner = s.accessCode === "KRT-SUN-2026-KEMRAA";
                return (
                  <tr key={s.id} className={clsx("hover:bg-gray-50/50 transition", isSuspended && "opacity-60")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center",
                          isOwner ? "bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06]" : "bg-gray-100 text-gray-600")}>
                          {s.profile?.firstName?.[0] ?? s.email?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {[s.profile?.firstName, s.profile?.lastName].filter(Boolean).join(" ") || "—"}
                            {isOwner && <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-[#C9A227] text-[#0C0A06] rounded">OWNER</span>}
                          </p>
                          <p className="text-xs text-gray-600" dir="ltr">{s.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className={clsx("px-2 py-1 rounded text-xs font-mono tracking-wider",
                          isOwner ? "bg-[#C9A227]/10 text-[#8C6D1F] font-bold" : "bg-gray-100 text-gray-700")}>
                          {revealed[s.id] ? s.accessCode : s.accessCode?.slice(0, 3) + "••••"}
                        </code>
                        <button onClick={() => setRevealed((r) => ({ ...r, [s.id]: !r[s.id] }))}
                          className="p-1 text-gray-500 hover:text-[#8C6D1F]" title={revealed[s.id] ? "Hide" : "Reveal"}>
                          {revealed[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {refreshing === s.id ? (
                          <Loader2 size={14} className="animate-spin text-gray-500" />
                        ) : (
                          !isOwner && (
                            <button onClick={() => handleRegen(s)} className="p-1 text-gray-500 hover:text-blue-600" title="Regenerate code">
                              <RefreshCw size={14} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {((s.features as any) ?? []).slice(0, 3).map((f: string) => (
                          <span key={f} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">{f}</span>
                        ))}
                        {((s.features as any) ?? []).length > 3 && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">+{((s.features as any) ?? []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold",
                        isSuspended ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                        {isSuspended ? <UserX size={12} /> : <UserCheck size={12} />}
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Edit features"><Shield size={15} /></button>
                        <button onClick={() => handleToggleLock(s)} disabled={isOwner}
                          className={clsx("p-1.5 rounded hover:bg-gray-100", isOwner ? "text-gray-300 cursor-not-allowed" : isSuspended ? "text-green-600" : "text-orange-600")}
                          title={isSuspended ? "Reactivate" : "Suspend"}>
                          {isSuspended ? <UserCheck size={15} /> : <UserX size={15} />}
                        </button>
                        {!isOwner && (
                          <button onClick={() => handleDelete(s)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[#C9A227]/30 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b sticky top-0 bg-white flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{modal === "create" ? "Add Staff Member" : "Edit Features"}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {modal === "create" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Full Name *</label>
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required
                      placeholder="Ahmed Hassan"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Features Access ({form.features.length}/{ALL_FEATURES.length})</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_FEATURES.map((f) => (
                    <button key={f.key} type="button" onClick={() => toggleFeature(f.key)}
                      className={clsx("px-3 py-2 text-xs rounded-lg border text-left flex items-center gap-2 transition",
                        form.features.includes(f.key)
                          ? "bg-[#C9A227]/10 border-[#C9A227] text-[#8C6D1F] font-semibold"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300")}>
                      <Check size={14} className={form.features.includes(f.key) ? "text-[#8C6D1F]" : "text-transparent"} />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

              <div className="flex gap-2 pt-2 border-t">
                <button type="button" onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" disabled={busy || (modal === "create" && !form.fullName.trim())}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {modal === "create" ? "Create & Generate Code" : "Save Features"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}