"use client";

import { useEffect, useState } from "react";
import { servicesApi, type Service } from "@/lib/api";
import {
  ShoppingBag, Plus, Edit3, Trash2, X, Search, Filter,
  Loader2, AlertTriangle, Check, Flame, Bed, Car, Plane,
  Coffee, Ticket, Wifi, Shield, MapPin, Package,
} from "lucide-react";
import clsx from "clsx";

const TYPES = [
  { key: "HOTEL", label: "Hotel", icon: Bed, color: "text-blue-600", bg: "bg-blue-100" },
  { key: "RESTAURANT", label: "Restaurant", icon: Coffee, color: "text-orange-600", bg: "bg-orange-100" },
  { key: "EXPERIENCE", label: "Experience", icon: Flame, color: "text-red-600", bg: "bg-red-100" },
  { key: "FLIGHT", label: "Flight", icon: Plane, color: "text-sky-600", bg: "bg-sky-100" },
  { key: "TRANSFER", label: "Transfer", icon: Car, color: "text-green-600", bg: "bg-green-100" },
  { key: "RIDE", label: "Ride", icon: Car, color: "text-emerald-600", bg: "bg-emerald-100" },
  { key: "CAR", label: "Car Rental", icon: Car, color: "text-indigo-600", bg: "bg-indigo-100" },
  { key: "TICKET", label: "Ticket", icon: Ticket, color: "text-purple-600", bg: "bg-purple-100" },
  { key: "INSURANCE", label: "Insurance", icon: Shield, color: "text-teal-600", bg: "bg-teal-100" },
  { key: "ESIM", label: "eSIM", icon: Wifi, color: "text-pink-600", bg: "bg-pink-100" },
];

const statusMeta: Record<string, { color: string; bg: string }> = {
  DRAFT:    { color: "text-gray-700",   bg: "bg-gray-100" },
  ACTIVE:   { color: "text-green-700",  bg: "bg-green-100" },
  INACTIVE: { color: "text-orange-700", bg: "bg-orange-100" },
  ARCHIVED: { color: "text-gray-600",   bg: "bg-gray-100" },
};

const egp = (minor: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);

type FormMode = "create" | "edit";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", type: "HOTEL", currency: "EGP", price: "" });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.list({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setServices(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [typeFilter, statusFilter, search]);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm({ title: "", description: "", type: "HOTEL", currency: "EGP", price: "" });
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setModalMode("edit");
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description ?? "",
      type: s.type,
      currency: s.currency,
      price: String(s.priceMinor / 100),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        currency: form.currency,
        priceMinor: Math.round(parseFloat(form.price || "0") * 100),
      };
      if (modalMode === "create") {
        await servicesApi.create(payload);
      } else if (editingId) {
        await servicesApi.update(editingId, payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (s: Service) => {
    try {
      if (s.status === "ACTIVE") await servicesApi.deactivate(s.id);
      else await servicesApi.activate(s.id);
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await servicesApi.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = services;
  const counts = {
    all: services.length,
    active: services.filter((s) => s.status === "ACTIVE").length,
    draft: services.filter((s) => s.status === "DRAFT").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={24} className="text-[#C9A227]" />
            Services
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {counts.all} total • {counts.active} active • {counts.draft} draft
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 flex items-center gap-2 shadow-[0_0_20px_rgba(201,162,39,0.25)]"
        >
          <Plus size={18} />
          New Service
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-300 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]/30"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-700">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600">No services found</p>
            <button onClick={openCreate} className="mt-3 text-sm text-[#8C6D1F] hover:text-[#C9A227] font-medium">
              Create your first service →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-800">
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => {
                const typeInfo = TYPES.find((t) => t.key === s.type) ?? { icon: Package, label: s.type, color: "text-gray-600", bg: "bg-gray-100" };
                const TypeIcon = typeInfo.icon;
                const st = statusMeta[s.status] ?? statusMeta.DRAFT;
                return (
                  <tr key={s.id} className="hover:bg-gray-100/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeInfo.bg)}>
                          <TypeIcon size={16} className={typeInfo.color} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{s.title}</p>
                          {s.description && <p className="text-xs text-gray-600 truncate max-w-sm">{s.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex px-2 py-0.5 rounded text-[11px] font-semibold", typeInfo.bg, typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {egp(s.priceMinor, s.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex px-2 py-0.5 rounded text-xs font-semibold", st.bg, st.color)}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.status !== "ACTIVE" ? (
                          <button
                            onClick={() => handleToggleStatus(s)}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-700 transition"
                            title="Activate"
                          >
                            <Check size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(s)}
                            className="p-1.5 rounded hover:bg-orange-50 text-orange-600 hover:text-orange-700 transition"
                            title="Deactivate"
                          >
                            <X size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Create / Edit Modal ===== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-lg border border-[#C9A227]/30 shadow-[0_0_60px_rgba(201,162,39,0.25)]">
            <div className="flex items-center justify-between p-5 border-b border-gray-300">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#E6C55C] flex items-center justify-center">
                  {modalMode === "create" ? <Plus size={16} className="text-[#0C0A06]" /> : <Edit3 size={16} className="text-[#0C0A06]" />}
                </div>
                {modalMode === "create" ? "New Service" : "Edit Service"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-gray-100 text-gray-700">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Cairo Pyramids Day Tour"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white"
                  >
                    {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-300 bg-gray-100 rounded-b-2xl">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-5 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {modalMode === "create" ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation ===== */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl text-gray-900 w-full max-w-sm border border-red-200 shadow-xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Service?</h3>
              <p className="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-300 bg-gray-100 rounded-b-2xl">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}