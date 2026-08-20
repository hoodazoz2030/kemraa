"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerTeamApi } from "@/lib/api";
import { Plus, X, Loader2, Shield, User, Users as UsersIcon, UserCog } from "lucide-react";

const ROLES = [
  { key: "PARTNER_ADMIN", label: "Admin", icon: Shield, desc: "Full control over company, services, finance, and team" },
  { key: "PARTNER_STAFF", label: "Staff", icon: UserCog, desc: "Operational access: bookings, drivers, services" },
  { key: "PARTNER_USER", label: "User", icon: User, desc: "Read-only access to specific modules" },
];
const PERMS = ["services.read","services.write","bookings.read","bookings.update","finance.read","users.manage","documents.read","documents.write","support.read","reports.read"];
const ROLE_ICON: any = { PARTNER_ADMIN: Shield, PARTNER_STAFF: UserCog, PARTNER_USER: User };

export default function TeamPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "PARTNER_STAFF", permissions: ["services.read","bookings.read"], firstName: "", lastName: "" });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: () => partnerTeamApi.list() });
  const createMut = useMutation({
    mutationFn: (d: any) => partnerTeamApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); setShowForm(false); setForm({ email: "", password: "", role: "PARTNER_STAFF", permissions: ["services.read","bookings.read"], firstName: "", lastName: "" }); setError(""); },
    onError: (e: any) => setError(e?.response?.data?.message || e?.error?.message || "Failed to create user"),
  });
  const updateMut = useMutation({ mutationFn: (v: any) => partnerTeamApi.update(v.userId, v.data), onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }) });
  const removeMut = useMutation({ mutationFn: (userId: string) => partnerTeamApi.remove(userId), onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }) });

  const items = data?.items ?? [];
  const togglePerm = (p: string) => setForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Team</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Manage your company users and permissions (§6)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold hover:brightness-110 transition">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="EMAIL" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field label="PASSWORD" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
            <Field label="FIRST NAME" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <Field label="LAST NAME" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          </div>

          <div>
            <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">ROLE</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = form.role === r.key;
                return (
                  <button key={r.key} type="button" onClick={() => setForm({ ...form, role: r.key })} className={`text-left p-4 rounded-lg border transition ${active ? "border-kemraa-gold bg-kemraa-goldDark/20" : "border-kemraa-goldDark/20 hover:border-kemraa-goldDark/40"}`}>
                    <div className="flex items-center gap-2 mb-1"><Icon size={16} className="text-kemraa-gold" /><span className="text-sm font-semibold text-kemraa-text">{r.label}</span></div>
                    <div className="text-xs text-kemraa-text/50">{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">PERMISSIONS</label>
            <div className="flex flex-wrap gap-2">
              {PERMS.map((p) => (
                <button key={p} type="button" onClick={() => togglePerm(p)} className={`px-3 py-1.5 rounded-md text-xs transition ${form.permissions.includes(p) ? "bg-kemraa-goldDark/30 text-kemraa-gold border border-kemraa-gold/50" : "bg-white/5 text-kemraa-text/50 border border-kemraa-goldDark/20"}`}>{p}</button>
              ))}
            </div>
          </div>

          {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
          <button type="submit" disabled={createMut.isPending} className="px-6 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
            {createMut.isPending && <Loader2 className="animate-spin" size={16} />} Create User
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading team...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No team members yet.</div>
      ) : (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kemraa-goldDark/20 text-left">
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">USER</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">ROLE</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">STATUS</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">PERMISSIONS</th>
              <th className="px-5 py-4 text-kemraa-gold text-xs tracking-wider">ACTIONS</th>
            </tr></thead>
            <tbody>
              {items.map((m: any) => {
                const RoleIcon = ROLE_ICON[m.role] ?? User;
                return (
                  <tr key={m.userId} className="border-b border-kemraa-goldDark/10 last:border-0 hover:bg-white/5 transition">
                    <td className="px-5 py-4">
                      <div className="text-kemraa-text font-semibold">{m.user?.profile?.firstName} {m.user?.profile?.lastName}</div>
                      <div className="text-xs text-kemraa-text/50">{m.user?.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <RoleIcon size={14} className="text-kemraa-gold" />
                        <span className="text-kemraa-text">{m.role.replace("PARTNER_", "")}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`px-2 py-1 rounded text-[10px] tracking-wider ${m.status === "ACTIVE" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{m.status}</span></td>
                    <td className="px-5 py-4"><span className="text-xs text-kemraa-text/60">{m.permissions?.length ?? 0} permissions</span></td>
                    <td className="px-5 py-4">
                      {m.status === "ACTIVE" ? (
                        <button onClick={() => { if (confirm("Suspend this user?")) updateMut.mutate({ userId: m.userId, data: { status: "SUSPENDED" } }) }} className="px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs">Suspend</button>
                      ) : (
                        <button onClick={() => updateMut.mutate({ userId: m.userId, data: { status: "ACTIVE" } })} className="px-3 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs">Reactivate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: any) {
  return (
    <div>
      <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full px-3 py-2.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
    </div>
  );
}