"use client";

import { useEffect, useState } from "react";
import { usersApi, type UserSummary, type UserDetail } from "@/lib/api";
import {
  Users as UsersIcon, Search, Filter, Loader2, X, Eye, Shield, ShieldOff,
  Calendar, ShoppingBag, MessageSquare, Bell, Map, Mail, Phone, Clock,
  ChevronRight, Save, Check, AlertTriangle, UserCog,
} from "lucide-react";
import clsx from "clsx";

const STATUSES = ["", "PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"];
const ROLES = [
  "CUSTOMER", "DRIVER", "PARTNER_ADMIN", "PARTNER_STAFF", "AGENCY_ADMIN",
  "SUPPORT", "FINANCE", "OPERATIONS", "CONTENT", "ADMIN", "SUPER_ADMIN",
];

const statusMeta: Record<string, { color: string; bg: string }> = {
  PENDING_VERIFICATION: { color: "text-amber-700", bg: "bg-amber-100" },
  ACTIVE:   { color: "text-green-700",  bg: "bg-green-100" },
  SUSPENDED: { color: "text-red-700",    bg: "bg-red-100" },
  DEACTIVATED: { color: "text-gray-700", bg: "bg-gray-200" },
};

const roleColor: Record<string, { color: string; bg: string }> = {
  ADMIN: { color: "text-[#8C6D1F]", bg: "bg-[#F0D78C]/50 border border-[#C9A227]/40" },
  SUPER_ADMIN: { color: "text-[#8C6D1F]", bg: "bg-[#F0D78C]/50 border border-[#C9A227]/40" },
  CUSTOMER: { color: "text-gray-700", bg: "bg-gray-100" },
  SUPPORT: { color: "text-orange-700", bg: "bg-orange-100" },
  FINANCE: { color: "text-green-700", bg: "bg-green-100" },
  OPERATIONS: { color: "text-blue-700", bg: "bg-blue-100" },
  PARTNER_ADMIN: { color: "text-purple-700", bg: "bg-purple-100" },
  PARTNER_STAFF: { color: "text-purple-600", bg: "bg-purple-100" },
  AGENCY_ADMIN: { color: "text-indigo-700", bg: "bg-indigo-100" },
  DRIVER: { color: "text-cyan-700", bg: "bg-cyan-100" },
  CONTENT: { color: "text-pink-700", bg: "bg-pink-100" },
};

const egp = (minor: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);

type DrawerTab = "overview" | "trips" | "bookings" | "tickets" | "notifications";

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");

  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [rolesModal, setRolesModal] = useState(false);
  const [editedRoles, setEditedRoles] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [statusFilter, roleFilter, search]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const u = await usersApi.getDetail(id);
      setSelected(u);
      setActiveTab("overview");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selected || !newStatus) return;
    setSaving(true);
    try {
      await usersApi.updateStatus(selected.id, newStatus, statusReason.trim() || undefined);
      setStatusModal(false);
      setStatusReason("");
      await openDetail(selected.id);
      await load();
    } catch (e) {
      alert("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!selected || editedRoles.length === 0) return;
    setSaving(true);
    try {
      await usersApi.setRoles(selected.id, editedRoles);
      setRolesModal(false);
      await openDetail(selected.id);
      await load();
    } catch (e) {
      alert("Failed to update roles");
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = (presetStatus?: string) => {
    setNewStatus(presetStatus ?? (selected?.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"));
    setStatusReason("");
    setStatusModal(true);
  };

  const openRolesModal = () => {
    setEditedRoles([...(selected?.roles ?? [])]);
    setRolesModal(true);
  };

  const toggleRole = (r: string) => {
    setEditedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const statusCounts = STATUSES.slice(1).reduce<Record<string, number>>((acc, s) => {
    acc[s] = users.filter((u) => u.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UsersIcon size={24} className="text-[#C9A227]" />
          Users
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} users
          {statusCounts.ACTIVE > 0 && <span className="ml-2 text-green-700 font-medium">• {statusCounts.ACTIVE} active</span>}
          {statusCounts.SUSPENDED > 0 && <span className="ml-2 text-red-700 font-medium">• {statusCounts.SUSPENDED} suspended</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">All statuses</option>
            {STATUSES.slice(1).map((s) => <option key={s} value={s}>{s} ({statusCounts[s] ?? 0})</option>)}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UsersIcon size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Roles</th>
                <th className="px-4 py-3 font-semibold">Activity</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const st = statusMeta[u.status] ?? statusMeta.ACTIVE;
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                const initials = name !== "—"
                  ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                  : (u.email?.[0]?.toUpperCase() ?? "?");
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-sm flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{name}</p>
                          {u.mfaEnabled && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
                              <Shield size={10} /> MFA
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-0.5">
                        {u.email && <div className="flex items-center gap-1 text-gray-700"><Mail size={11} /> {u.email}</div>}
                        {u.phone && <div className="flex items-center gap-1 text-gray-500"><Phone size={11} /> {u.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(u.roles)].slice(0, 3).map((r) => {
                          const rc = roleColor[r] ?? { color: "text-gray-700", bg: "bg-gray-100" };
                          return (
                            <span key={r} className={clsx("px-1.5 py-0.5 rounded text-[10px] font-semibold", rc.bg, rc.color)}>
                              {r}
                            </span>
                          );
                        })}
                        {u.roles.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{u.roles.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div className="flex items-center gap-1"><Map size={11} /> {u.tripsCount} trips</div>
                        <div className="flex items-center gap-1"><ShoppingBag size={11} /> {u.bookingsCount} bookings</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex px-2 py-0.5 rounded text-xs font-semibold", st.bg, st.color)}>
                        {u.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(u.id)}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition"
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== DETAIL DRAWER ===== */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-[#C9A227]/30 flex flex-col">
            {/* Drawer header */}
            <div className="p-5 border-b bg-gradient-to-r from-[#F0D78C]/30 to-transparent flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {selected.avatarUrl ? (
                  <img src={selected.avatarUrl} className="w-14 h-14 rounded-full object-cover ring-2 ring-[#C9A227]/50" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-lg flex items-center justify-center ring-2 ring-[#C9A227]/50">
                    {[selected.firstName, selected.lastName].filter(Boolean).join(" ").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {[selected.firstName, selected.lastName].filter(Boolean).join(" ") || "Unnamed User"}
                  </h2>
                  <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span dir="ltr">{selected.email ?? "—"}</span>
                    <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-semibold", statusMeta[selected.status]?.bg, statusMeta[selected.status]?.color)}>
                      {selected.status.replace("_", " ")}
                    </span>
                  </p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Drawer actions */}
            <div className="px-5 py-3 border-b flex gap-2 bg-gray-50/50">
              <button
                onClick={() => openStatusModal()}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border",
                  selected.status === "ACTIVE"
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                )}
              >
                {selected.status === "ACTIVE" ? <ShieldOff size={13} /> : <Shield size={13} />}
                {selected.status === "ACTIVE" ? "Suspend" : "Activate"}
              </button>
              <button
                onClick={openRolesModal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] hover:brightness-110"
              >
                <UserCog size={13} /> Manage Roles
              </button>
            </div>

            {/* Tabs */}
            <div className="px-5 border-b flex gap-1 bg-white">
              {([
                { key: "overview", label: "Overview", icon: UsersIcon },
                { key: "trips", label: `Trips (${selected._count.trips})`, icon: Map },
                { key: "bookings", label: `Bookings (${selected._count.bookings})`, icon: ShoppingBag },
                { key: "tickets", label: `Tickets (${selected._count.tickets})`, icon: MessageSquare },
                { key: "notifications", label: `Notifs (${selected._count.notifications})`, icon: Bell },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      "px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition",
                      activeTab === tab.key
                        ? "border-[#C9A227] text-[#8C6D1F]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="text-sm text-gray-900 mt-1 break-all" dir="ltr">{selected.email ?? "—"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-gray-900 mt-1" dir="ltr">{selected.phone ?? "—"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Organization</p>
                      <p className="text-sm text-gray-900 mt-1">{selected.organization ?? "—"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Locale / Timezone</p>
                      <p className="text-sm text-gray-900 mt-1">{(selected as any).locale ?? "ar-EG"} / {(selected as any).timezone ?? "Africa/Cairo"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">MFA</p>
                      <p className="text-sm mt-1 flex items-center gap-1">
                        {selected.mfaEnabled ? (
                          <><Shield size={13} className="text-green-600" /> <span className="text-green-700 font-semibold">Enabled</span></>
                        ) : (
                          <span className="text-gray-500">Disabled</span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Joined</p>
                      <p className="text-sm text-gray-900 mt-1">{new Date(selected.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Roles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set(selected.roles)].map((r) => {
                        const rc = roleColor[r] ?? { color: "text-gray-700", bg: "bg-gray-100" };
                        return (
                          <span key={r} className={clsx("px-2 py-1 rounded text-xs font-semibold", rc.bg, rc.color)}>
                            {r}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2">
                    <div className="p-3 bg-gradient-to-br from-[#C9A227]/10 to-transparent rounded-lg text-center border border-[#C9A227]/20">
                      <Map size={16} className="mx-auto text-[#C9A227]" />
                      <p className="text-lg font-bold text-gray-900 mt-1">{selected._count.trips}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Trips</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-[#C9A227]/10 to-transparent rounded-lg text-center border border-[#C9A227]/20">
                      <ShoppingBag size={16} className="mx-auto text-[#C9A227]" />
                      <p className="text-lg font-bold text-gray-900 mt-1">{selected._count.bookings}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Bookings</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-[#C9A227]/10 to-transparent rounded-lg text-center border border-[#C9A227]/20">
                      <MessageSquare size={16} className="mx-auto text-[#C9A227]" />
                      <p className="text-lg font-bold text-gray-900 mt-1">{selected._count.tickets}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Tickets</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-[#C9A227]/10 to-transparent rounded-lg text-center border border-[#C9A227]/20">
                      <Bell size={16} className="mx-auto text-[#C9A227]" />
                      <p className="text-lg font-bold text-gray-900 mt-1">{selected._count.notifications}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Notifs</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "trips" && (
                <div className="space-y-2">
                  {selected.trips.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No trips yet</p>
                  ) : (
                    selected.trips.map((t) => (
                      <div key={t.id} className="p-3 border border-gray-200 rounded-lg hover:border-[#C9A227]/40 transition">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <Map size={11} /> {t.destinationCountry}
                              <span>•</span>
                              <Clock size={11} /> {new Date(t.startAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900">{egp(t.budgetMinor, t.currency)}</p>
                            <span className={clsx("inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5", statusMeta[t.status]?.bg ?? "bg-gray-100", statusMeta[t.status]?.color ?? "text-gray-700")}>
                              {t.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "bookings" && (
                <div className="space-y-2">
                  {selected.bookings.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No bookings yet</p>
                  ) : (
                    selected.bookings.map((b) => (
                      <div key={b.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{b.service?.title ?? "Booking"}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{b.service?.type ?? ""} • {new Date(b.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900">{egp(b.totalMinor, b.currency)}</p>
                            <span className={clsx("inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5", statusMeta[b.status]?.bg ?? "bg-gray-100", statusMeta[b.status]?.color ?? "text-gray-700")}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "tickets" && (
                <div className="space-y-2">
                  {selected.tickets.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No tickets</p>
                  ) : (
                    selected.tickets.map((t) => (
                      <div key={t.id} className="p-3 border border-gray-200 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{t.subject}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-semibold", statusMeta[t.status]?.bg ?? "bg-gray-100", statusMeta[t.status]?.color ?? "text-gray-700")}>
                            {t.status}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase">{t.category}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-2">
                  {selected.notifications.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No notifications</p>
                  ) : (
                    selected.notifications.map((n) => (
                      <div key={n.id} className="p-3 border border-gray-200 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 uppercase">{n.type}</span>
                          {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />}
                          <span className="text-[10px] text-gray-400 ml-auto">{new Date(n.sentAt ?? n.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== Status Modal ===== */}
      {statusModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-[#C9A227]/30">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {newStatus === "SUSPENDED" ? <ShieldOff size={20} className="text-red-600" /> : <Shield size={20} className="text-green-600" />}
                {newStatus === "SUSPENDED" ? "Suspend User" : newStatus === "DEACTIVATED" ? "Deactivate User" : "Activate User"}
              </h3>
              <button onClick={() => setStatusModal(false)} className="p-1.5 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Reason (optional)</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Why are you changing this status?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227] resize-none"
                />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>This will notify the user about the status change.</span>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setStatusModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatus}
                disabled={saving}
                className={clsx(
                  "flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 text-white",
                  newStatus === "SUSPENDED" || newStatus === "DEACTIVATED"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                )}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Roles Modal ===== */}
      {rolesModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-[#C9A227]/30">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCog size={20} className="text-[#C9A227]" />
                Manage Roles
              </h3>
              <button onClick={() => setRolesModal(false)} className="p-1.5 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-500 mb-3">Select the roles for this user. Must have at least one role.</p>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {ROLES.map((r) => {
                  const active = editedRoles.includes(r);
                  const rc = roleColor[r] ?? { color: "text-gray-700", bg: "bg-gray-100" };
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRole(r)}
                      className={clsx(
                        "p-2.5 rounded-lg border-2 text-xs font-semibold transition text-left",
                        active
                          ? "border-[#C9A227] bg-[#F0D78C]/30 text-[#8C6D1F]"
                          : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0", active ? "bg-[#C9A227] border-[#C9A227]" : "border-gray-300")}>
                          {active && <Check size={10} className="text-[#0C0A06]" />}
                        </div>
                        {r}
                      </div>
                    </button>
                  );
                })}
              </div>
              {editedRoles.length === 0 && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> At least one role required
                </p>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setRolesModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={saving || editedRoles.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Roles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}