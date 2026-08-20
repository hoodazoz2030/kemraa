"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerServicesApi } from "@/lib/api";
import { Plus, Power, PowerOff, X, Loader2 } from "lucide-react";

const SERVICE_TYPES = ["HOTEL", "RESTAURANT", "TRANSPORT", "CAR_RENTAL", "ACTIVITY", "TOUR", "INSURANCE", "ESIM"];

function formatMinor(m: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100);
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "HOTEL", title: "", price: "", description: "" });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["services"], queryFn: () => partnerServicesApi.list() });
  const items = Array.isArray(data) ? data : data?.items ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => partnerServicesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setShowForm(false); setForm({ type: "HOTEL", title: "", price: "", description: "" }); setError(""); },
    onError: (e: any) => setError(e?.response?.data?.message || "Failed to create service"),
  });
  const activateMut = useMutation({ mutationFn: (id: string) => partnerServicesApi.activate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }) });
  const deactivateMut = useMutation({ mutationFn: (id: string) => partnerServicesApi.deactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }) });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ type: form.type, title: form.title, priceMinor: Math.round(parseFloat(form.price) * 100) || 0, currency: "EGP", description: form.description || null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Services</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Manage your offerings on KEMRAA</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold hover:brightness-110 transition">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? "Cancel" : "Add Service"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">TYPE</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text focus:outline-none focus:border-kemraa-gold">
                {SERVICE_TYPES.map((t) => <option key={t} value={t} className="bg-kemraa-dark">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">TITLE</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g., Cairo Hotel Deluxe" className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
            </div>
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">PRICE (EGP)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="1500.00" className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
            </div>
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">DESCRIPTION</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
            </div>
          </div>
          {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
          <button type="submit" disabled={createMut.isPending} className="px-6 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
            {createMut.isPending && <Loader2 className="animate-spin" size={16} />} Create Service
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading services...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">
          No services yet. Click &quot;Add Service&quot; to create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s: any) => (
            <div key={s.id} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-5 hover:border-kemraa-goldDark/40 transition">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] px-2 py-1 rounded bg-kemraa-goldDark/20 text-kemraa-gold tracking-wider">{s.type}</span>
                <span className={`text-[10px] px-2 py-1 rounded tracking-wider ${s.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{s.status}</span>
              </div>
              <h3 className="text-lg font-semibold text-kemraa-text mb-1">{s.title}</h3>
              {s.description && <p className="text-xs text-kemraa-text/50 mb-3 line-clamp-2">{s.description}</p>}
              <div className="text-xl font-bold text-kemraa-gold mb-4">EGP {formatMinor(s.priceMinor)}</div>
              <div className="flex gap-2">
                {s.status === "ACTIVE" ? (
                  <button onClick={() => deactivateMut.mutate(s.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-sm">
                    <PowerOff size={14} /> Deactivate
                  </button>
                ) : (
                  <button onClick={() => activateMut.mutate(s.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-green-500/40 text-green-400 hover:bg-green-500/10 transition text-sm">
                    <Power size={14} /> Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
