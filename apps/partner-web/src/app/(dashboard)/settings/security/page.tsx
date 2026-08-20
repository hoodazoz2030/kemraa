"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerSecurityApi } from "@/lib/api";
import { Shield, Monitor, Trash2, Plus, Loader2 } from "lucide-react";

export default function SecuritySettingsPage() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["mfa-status"], queryFn: () => partnerSecurityApi.mfaStatus() });
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => partnerSecurityApi.devices() });
  const revokeMut = useMutation({ mutationFn: (id: string) => partnerSecurityApi.revokeDevice(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }) });

  const isMfa = status.data?.enabled === true;
  const items = devices.data?.items ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Security Settings</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Manage MFA and trusted devices</p>
      </div>

      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center"><Shield size={22} className="text-kemraa-dark" /></div>
            <div>
              <h2 className="text-kemraa-text font-semibold">Two-Factor Authentication</h2>
              <p className="text-xs text-kemraa-text/60">{isMfa ? "Your account is protected with 2FA" : "Add extra security to your account"}</p>
            </div>
          </div>
          {status.isLoading ? (
            <Loader2 className="animate-spin text-kemraa-gold" />
          ) : isMfa ? (
            <Link href="/mfa/setup" className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10">Disable</Link>
          ) : (
            <Link href="/mfa/setup" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark text-sm font-semibold">
              <Plus size={14} /> Enable 2FA
            </Link>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-kemraa-gold font-semibold tracking-wider">Trusted Devices</h2>
          <span className="text-xs text-kemraa-text/50">{items.length} device{items.length !== 1 ? "s" : ""}</span>
        </div>

        {devices.isLoading ? (
          <div className="text-kemraa-text/60 py-6 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-kemraa-text/50 py-6 text-center text-sm">No trusted devices. Devices are added when you complete MFA login.</div>
        ) : (
          <div className="space-y-2">
            {items.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-kemraa-dark border border-kemraa-goldDark/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center"><Monitor size={16} className="text-kemraa-gold" /></div>
                  <div>
                    <div className="text-sm text-kemraa-text font-medium">{d.deviceName || "Trusted device"}</div>
                    <div className="text-xs text-kemraa-text/50">Last seen: {new Date(d.lastSeenAt).toLocaleString()}</div>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm("Revoke this device? You'll need to re-enter MFA code next login.")) revokeMut.mutate(d.id) }}
                  className="p-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  title="Revoke device"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}