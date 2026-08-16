"use client";

import { useEffect, useState } from "react";
import { staffApi, type StaffMember } from "@/lib/api";
import { Users, Plus, Shield, Loader2, X, Save, UserCheck, UserX, Key, Trash2, Search } from "lucide-react";
import clsx from "clsx";

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ username: "", password: "", email: "", fullName: "", role: "ADMIN", status: "ACTIVE" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try { setStaff(await staffApi.list()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setSelected(null);
    setForm({ username: "", password: "", email: "", fullName: "", role: "ADMIN", status: "ACTIVE" });
    setError("");
    setModal("create");
  };

  const openEdit = (s: StaffMember) => {
    setSelected(s);
    setForm({
      username: s.username,
      password: "",
      email: s.email ?? "",
      fullName: [s.profile?.firstName, s.profile?.lastName].filter(Boolean).join(" "),
      role: s.orgMembers[0]?.role ?? "ADMIN",
      status: s.status,
    });
    setError("");
    setModal("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (modal === "create") {
        if (!form.username || !form.password || !form.email) { setError("All fields required"); return; }
        await staffApi.create(form);
      } else if (selected) {
        const updates: any = {};
        if (form.status) updates.status = form.status;
        if (form.role) updates.role = form.role;
        if (form.password) updates.password = form.password;
        await staffApi.update(selected.id, updates);
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Operation failed");
    } finally { setBusy(false); }
  };

  const handleDelete = async (s: StaffMember) => {
    if (!confirm(`Delete staff account "${s.username}"? This cannot be undone.`)) return;
    try { await staffApi.delete(s.id); await load(); } catch (e) { alert("Delete failed"); }
  };

  const filtered = staff.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.username.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-[#C9A227]" /> Staff Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">{staff.length} staff members • SUPER_ADMIN access only</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 flex items-center gap-2">
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by username or email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={24} />Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><Users size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No staff members</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-sm flex items-center justify-center">
                        {s.profile?.firstName?.[0] ?? s.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{[s.profile?.firstName, s.profile?.lastName].filter(Boolean).join(" ") || s.username}</p>
                        <p className="text-xs text-gray-500" dir="ltr">@{s.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600" dir="ltr">{s.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#F0D78C]/30 text-[#8C6D1F]">
                      <Shield size={12} /> {s.orgMembers[0]?.role ?? "ADMIN"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold",
                      s.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {s.status === "ACTIVE" ? <UserCheck size={12} /> : <UserX size={12} />} {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Edit"><Key size={15} /></button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#C9A227]/30">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{modal === "create" ? "Add Staff Member" : "Edit Staff"}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {modal === "create" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Username</label>
                      <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required dir="ltr"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Password</label>
                      <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required dir="ltr"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                  </div>
                </>
              )}

              {modal === "edit" && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    Editing: <strong dir="ltr">@{form.username}</strong> • {form.email}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">New Password (leave empty to keep current)</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Role</label>
                      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="STAFF">STAFF</option>
                        <option value="FINANCE">FINANCE</option>
                        <option value="SUPPORT">SUPPORT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" disabled={busy}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {modal === "create" ? "Create" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}