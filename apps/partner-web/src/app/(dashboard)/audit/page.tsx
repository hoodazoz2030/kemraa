"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { History } from "lucide-react";

export default function AuditPage() {
  // Note: This endpoint needs to be created in backend if not exists. Using placeholder.
  // For now, show recent actions based on available data
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Activity Log</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Audit trail of actions performed in your company (§21)</p>
      </div>

      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-12 text-center">
        <History size={48} className="mx-auto text-kemraa-text/30 mb-3" />
        <div className="text-kemraa-text/60 mb-2">Full audit log integration</div>
        <div className="text-xs text-kemraa-text/40">All sensitive operations (service create, team changes, settlements) are logged server-side via the AuditInterceptor with actor/action/resource/metadata.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="What is tracked" items={["Login/logout events", "Team member create/update/suspend", "Service create/activate/deactivate", "Booking approve/reject/confirm", "Settlement approval", "Document uploads", "Contract signing"]} />
        <InfoCard title="Compliance" items={["Actor IP captured", "Timestamps recorded", "Before/after state stored", "Sensitive data masked", "Read-only for non-admins", "Export available on request"]} />
      </div>
    </div>
  );
}

function InfoCard({ title, items }: any) {
  return (
    <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
      <h3 className="text-kemraa-gold font-semibold mb-4 tracking-wider">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((i: string) => (
          <li key={i} className="text-kemraa-text/70 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-kemraa-gold" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}