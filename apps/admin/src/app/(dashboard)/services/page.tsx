"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/format";
import { useState, FormEvent } from "react";
import { Plus, X } from "lucide-react";

const TYPES = ["HOTEL","RESTAURANT","EXPERIENCE","FLIGHT","TRANSFER","RIDE","CAR","TICKET","INSURANCE","ESIM"];

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("HOTEL");
  const [price, setPrice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get("/services", { params: { limit: 100 } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/services", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowForm(false);
      setTitle(""); setPrice("");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/services/${id}/status`, { status: "ACTIVE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      type,
      priceMinor: Math.round(parseFloat(price || "0") * 100),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "New Service"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Service title"
            required
            className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2"
          />
          <select value={type} onChange={(e) => setType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price (EGP)"
            type="number"
            step="0.01"
            required
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <button type="submit" className="md:col-span-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
            Create Service
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Title</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            )}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No services</td></tr>
            )}
            {(data?.items ?? []).map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                <td className="px-4 py-3 text-gray-600">{s.type}</td>
                <td className="px-4 py-3 text-gray-600">{formatMoney(s.priceMinor, s.currency)}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3">
                  {s.status === "DRAFT" && (
                    <button
                      onClick={() => activateMutation.mutate(s.id)}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}