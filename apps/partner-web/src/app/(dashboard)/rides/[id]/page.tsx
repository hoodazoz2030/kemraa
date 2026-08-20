"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { partnerRidesApi } from "@/lib/api";
import { ArrowLeft, Car } from "lucide-react";
import Link from "next/link";

function fmt(m: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100); }

export default function RideDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: r, isLoading } = useQuery({ queryKey: ["ride", id], queryFn: () => partnerRidesApi.detail(id) });

  if (isLoading) return <div className="text-kemraa-text/60 py-12 text-center">Loading ride...</div>;
  if (!r) return <div className="text-red-400 py-12 text-center">Ride not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/rides" className="inline-flex items-center gap-2 text-kemraa-text/60 hover:text-kemraa-gold transition text-sm">
        <ArrowLeft size={16} /> Back to Rides
      </Link>

      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-kemraa-gold font-mono">{r.id.slice(0, 8)}</h1>
          <span className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs tracking-wider">{r.status}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-8">
          <Info label="Driver" value={r.driver?.user?.email ?? "—"} />
          <Info label="Fare" value={`EGP ${fmt(r.fareMinor)}`} highlight />
          <Info label="Currency" value={r.currency} />
          <Info label="Created" value={new Date(r.createdAt).toLocaleString()} />
        </div>

        <h2 className="text-kemraa-gold font-semibold mb-4 tracking-wider">Ride Events Timeline</h2>
        {(r.events ?? []).length === 0 ? (
          <div className="text-kemraa-text/50 text-sm">No events recorded yet.</div>
        ) : (
          <div className="space-y-0">
            {r.events.map((ev: any, i: number) => (
              <div key={ev.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold mt-1" />
                  {i < r.events.length - 1 && <div className="w-px flex-1 bg-kemraa-goldDark/30" />}
                </div>
                <div className="pb-6">
                  <div className="text-sm text-kemraa-text font-semibold">{ev.type}</div>
                  <div className="text-xs text-kemraa-text/50">{new Date(ev.occurredAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
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