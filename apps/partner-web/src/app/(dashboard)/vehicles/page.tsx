"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerVehiclesApi, partnerDriversApi } from "@/lib/api";
import { Plus, Truck, X, Loader2, UserPlus, Trash2, Wrench } from "lucide-react";

const V_STATUS: any = {
  ACTIVE: "bg-green-500/10 text-green-400",
  INACTIVE: "bg-gray-500/10 text-gray-400",
  MAINTENANCE: "bg-yellow-500/10 text-yellow-400",
};

export default function VehiclesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plateRef: "", make: "", model: "", year: "2023", capacity: "4" });
  const [error, setError] = useState("");
  const [assign, setAssign] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({ queryKey: ["vehicles"], queryFn: () => partnerVehiclesApi.list() });
  const drivers = useQuery({ queryKey: ["drivers"], queryFn: () => partnerDriversApi.list() });

  const createMut = useMutation({
    mutationFn: (d: any) => partnerVehiclesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); setShowForm(false); setForm({ plateRef: "", make: "", model: "", year: "2023", capacity: "4" }); setError(""); },
    onError: (e: any) => setError(e?.response?.data?.message || "Failed to create vehicle"),
  });
  const updateMut = useMutation({ mutationFn: (v: { id: string; data: any }) => partnerVehiclesApi.update(v.id, v.data), onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }) });
  const assignMut = useMutation({ mutationFn: (v: { id: string; driverId: string }) => partnerVehiclesApi.assignDriver(v.id, v.driverId), onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }) });
  const removeMut = useMutation({ mutationFn: (id: string) => partnerVehiclesApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }) });

  const items = data?.items ?? [];
  const driverItems = drivers.data?.items ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ plateRef: form.plateRef, make: form.make, model: form.model, year: parseInt(form.year), capacity: parseInt(form.capacity) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Vehicles</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Fleet management: capacity, status, and driver assignment</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold hover:brightness-110 transition">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? "Cancel" : "Add Vehicle"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Input label="PLATE" value={form.plateRef} onChange={(v) => setForm({ ...form, plateRef: v })} placeholder="ABC-123" required />
            <Input label="MAKE" value={form.make} onChange={(v) => setForm({ ...form, make: v })} placeholder="Toyota" required />
            <Input label="MODEL" value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="Camry" required />
            <Input label="YEAR" type="number" value={form.year} onChange={(v) => setForm({ ...form, year: v })} required />
            <Input label="CAPACITY" type="number" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} required />
          </div>
          {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
          <button type="submit" disabled={createMut.isPending} className="px-6 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
            {createMut.isPending && <Loader2 className="animate-spin" size={16} />} Create Vehicle
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading vehicles...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No vehicles yet. Click &quot;Add Vehicle&quot;.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((v: any) => (
            <div key={v.id} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-5 hover:border-kemraa-goldDark/40 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center"><Truck size={18} className="text-kemraa-dark" /></div>
                  <div>
                    <div className="text-kemraa-text font-semibold">{v.make} {v.model}</div>
                    <div className="text-xs text-kemraa-gold font-mono">{v.plateRef}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] tracking-wider ${V_STATUS[v.status]}`}>{v.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-kemraa-text/60 mb-3">
                <div>Year: <span className="text-kemraa-text">{v.year}</span></div>
                <div>Seats: <span className="text-kemraa-text">{v.capacity}</span></div>
                <div>Driver: <span className="text-kemraa-text">{v.driver?.user?.email ? "✓" : "—"}</span></div>
              </div>
              <div className="flex gap-2 mb-3">
                <select value={assign[v.id] ?? ""} onChange={(e) => setAssign({ ...assign, [v.id]: e.target.value })} className="flex-1 px-2 py-1.5 bg-white/5 border border-kemraa-goldDark/30 rounded-lg text-xs text-kemraa-text focus:outline-none focus:border-kemraa-gold">
                  <option value="" className="bg-kemraa-dark">Assign driver...</option>
                  {driverItems.map((d: any) => <option key={d.userId} value={d.userId} className="bg-kemraa-dark">{d.user?.email}</option>)}
                </select>
                <button onClick={() => assign[v.id] && assignMut.mutate({ id: v.id, driverId: assign[v.id] })} disabled={!assign[v.id]} className="p-1.5 rounded bg-kemraa-goldDark/20 text-kemraa-gold hover:bg-kemraa-goldDark/30 disabled:opacity-40" title="Assign driver">
                  <UserPlus size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                {v.status !== "MAINTENANCE" ? (
                  <button onClick={() => updateMut.mutate({ id: v.id, data: { status: "MAINTENANCE" } })} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 text-xs"><Wrench size={12} /> Maintenance</button>
                ) : (
                  <button onClick={() => updateMut.mutate({ id: v.id, data: { status: "ACTIVE" } })} className="flex-1 py-1.5 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 text-xs">Back to Active</button>
                )}
                <button onClick={() => { if (confirm("Delete this vehicle?")) removeMut.mutate(v.id) }} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required }: any) {
  return (
    <div>
      <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full px-3 py-2.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
    </div>
  );
}