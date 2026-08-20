"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerServicesApi } from "@/lib/api";
import { ArrowLeft, Power, PowerOff } from "lucide-react";
import Link from "next/link";

function formatMinor(m: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100);
}

export default function ServiceDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery({ queryKey: ["service", id], queryFn: () => partnerServicesApi.detail(id) });

  const activateMut = useMutation({ mutationFn: () => partnerServicesApi.activate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["service", id] }) });
  const deactivateMut = useMutation({ mutationFn: () => partnerServicesApi.deactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["service", id] }) });

  if (isLoading) return <div className="text-kemraa-text/60 py-12 text-center">Loading service...</div>;
  if (!s) return <div className="text-red-400 py-12 text-center">Service not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/services" className="inline-flex items-center gap-2 text-kemraa-text/60 hover:text-kemraa-gold transition text-sm">
        <ArrowLeft size={16} /> Back to Services
      </Link>
      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-kemraa-gold">{s.title}</h1>
          <span className={`px-3 py-1 rounded text-xs tracking-wider ${s.status === "ACTIVE" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{s.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <Info label="Type" value={s.type} />
          <Info label="Price" value={`EGP ${formatMinor(s.priceMinor)}`} highlight />
          <Info label="Currency" value={s.currency} />
          <Info label="Created" value={new Date(s.createdAt).toLocaleDateString()} />
        </div>
        {s.description && <p className="text-kemraa-text/70 mb-6">{s.description}</p>}
        {s.status === "ACTIVE" ? (
          <button onClick={() => deactivateMut.mutate()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition">
            <PowerOff size={16} /> Deactivate Service
          </button>
        ) : (
          <button onClick={() => activateMut.mutate()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-green-500/40 text-green-400 hover:bg-green-500/10 transition">
            <Power size={16} /> Activate Service
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, highlight }: any) {
  return (
    <div>
      <div className="text-xs text-kemraa-text/50 uppercase tracking-wider mb-1">{label}</div>
      <div className={highlight ? "text-kemraa-gold font-bold text-lg" : "text-kemraa-text"}>{value}</div>
    </div>
  );
}