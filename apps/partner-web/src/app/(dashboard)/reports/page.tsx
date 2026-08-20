"use client";
import { useState } from "react";
import Cookies from "js-cookie";
import { partnerReportsApi } from "@/lib/api";
import { Download, Calendar, DollarSign, XCircle, Map, Loader2 } from "lucide-react";

async function downloadCsv(url: string, filename: string) {
  const token = Cookies.get("access_token");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReportsPage() {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const reports = [
    { key: "bookings", icon: Calendar, title: "Bookings Report", desc: "All bookings with status, value, and customer", url: () => partnerReportsApi.bookingsCsvUrl(), file: "bookings.csv" },
    { key: "earnings", icon: DollarSign, title: "Earnings Report", desc: "Gross / Commission / Net per booking", url: () => partnerReportsApi.earningsCsvUrl(), file: "earnings.csv" },
    { key: "cancellations", icon: XCircle, title: "Cancellations Report", desc: "Cancelled and rejected bookings", url: () => partnerReportsApi.cancellationsCsvUrl(), file: "cancellations.csv" },
    { key: "services", icon: Map, title: "Services Report", desc: "Your services with prices and booking counts", url: () => partnerReportsApi.servicesCsvUrl(), file: "services.csv" },
  ];

  const dl = async (r: any) => {
    setBusy(r.key); setMsg("");
    try {
      await downloadCsv(r.url(), r.file);
      setMsg(`${r.file} downloaded successfully`);
    } catch {
      setMsg("Download failed — check your permissions");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Reports</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Export your data as CSV (Excel-compatible with Arabic support)</p>
      </div>

      {msg && <div className="p-3 bg-kemraa-goldDark/10 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-gold">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div key={r.key} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6 hover:border-kemraa-goldDark/40 transition">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center"><r.icon size={20} className="text-kemraa-dark" /></div>
            </div>
            <h3 className="text-lg font-semibold text-kemraa-text mb-1">{r.title}</h3>
            <p className="text-xs text-kemraa-text/50 mb-5">{r.desc}</p>
            <button onClick={() => dl(r)} disabled={busy === r.key} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 hover:brightness-110 transition text-sm">
              {busy === r.key ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} Download CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}