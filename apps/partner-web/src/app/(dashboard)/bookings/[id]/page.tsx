"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { partnerBookingsApi } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function formatMinor(m: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(m / 100);
}

export default function BookingDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: b, isLoading } = useQuery({ queryKey: ["booking", id], queryFn: () => partnerBookingsApi.detail(id) });

  if (isLoading) return <div className="text-kemraa-text/60 py-12 text-center">Loading booking...</div>;
  if (!b) return <div className="text-red-400 py-12 text-center">Booking not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/bookings" className="inline-flex items-center gap-2 text-kemraa-text/60 hover:text-kemraa-gold transition text-sm">
        <ArrowLeft size={16} /> Back to Bookings
      </Link>
      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-kemraa-gold font-mono">{b.id.slice(0, 8)}</h1>
          <span className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs tracking-wider">{b.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Created" value={new Date(b.createdAt).toLocaleString()} />
          <Info label="Currency" value={b.currency} />
          <Info label="Total" value={`EGP ${formatMinor(b.totalMinor)}`} highlight />
          {b.externalRef && <Info label="External Ref" value={b.externalRef} />}
        </div>
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