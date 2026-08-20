"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { partnerServicesApi, partnerDriversApi, partnerVehiclesApi } from "@/lib/api";
import { Building2, Users, Truck, Map } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const svcs = useQuery({ queryKey: ["services"], queryFn: () => partnerServicesApi.list() });
  const drvs = useQuery({ queryKey: ["drivers"], queryFn: () => partnerDriversApi.list() });
  const vhcs = useQuery({ queryKey: ["vehicles"], queryFn: () => partnerVehiclesApi.list() });

  const svcItems = Array.isArray(svcs.data) ? svcs.data : svcs.data?.items ?? [];
  const drvItems = drvs.data?.items ?? [];
  const vhcItems = vhcs.data?.items ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Company Profile</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Your company information on KEMRAA</p>
      </div>

      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center shadow-[0_0_30px_rgba(201,162,39,0.35)]">
            <Building2 size={40} className="text-kemraa-dark" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-kemraa-text">{user?.organization?.displayName || "Your Company"}</h2>
            <p className="text-sm text-kemraa-text/50">{user?.organization?.legalName}</p>
            <span className={`inline-block mt-2 px-2.5 py-1 rounded text-[10px] tracking-wider ${user?.organization?.status === "ACTIVE" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{user?.organization?.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Company ID" value={user?.organization?.id?.slice(0, 8) + "..."} mono />
          <Info label="Your Email" value={user?.email ?? "—"} />
          <Info label="Account Type" value={user?.accountType ?? "—"} />
          <Info label="Status" value={user?.organization?.status ?? "—"} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Map} label="Services" value={svcItems.length} />
        <StatCard icon={Users} label="Drivers" value={drvItems.length} />
        <StatCard icon={Truck} label="Vehicles" value={vhcItems.length} />
      </div>
    </div>
  );
}

function Info({ label, value, mono }: any) {
  return (
    <div className="border-t border-kemraa-goldDark/10 pt-3">
      <div className="text-xs text-kemraa-text/50 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-kemraa-text ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-5 text-center">
      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center mx-auto mb-3"><Icon size={20} className="text-kemraa-dark" /></div>
      <div className="text-3xl font-bold text-kemraa-gold">{value}</div>
      <div className="text-xs text-kemraa-text/60 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}