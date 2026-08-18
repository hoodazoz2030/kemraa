"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Car, Users, FileText, Receipt, LogOut,
  Upload, Loader2, DollarSign, TrendingUp, Package
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Dashboard = {
  totalBookings: number;
  totalDrivers: number;
  totalVehicles: number;
  totalSettlements: number;
  totalDocuments: number;
  totalRevenueMinor: number;
};

type MeData = {
  organization: { displayName: string; legalName: string; country: string };
  services: any[];
  drivers: any[];
  vehicles: any[];
  settlements: any[];
  documents: any[];
};

export default function PortalDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "bookings" | "drivers" | "vehicles" | "documents">("overview");
  const [docForm, setDocForm] = useState({ docType: "LICENSE", fileName: "", fileUrl: "", fileSize: 0, notes: "" });
  const [docBusy, setDocBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("kemraa_portal_token");
    const userStr = localStorage.getItem("kemraa_portal_user");
    if (!token || !userStr) {
      router.push("/portal/login");
      return;
    }
    try { setUser(JSON.parse(userStr)); } catch {}

    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/partner-portal/me`, { headers: h }).then(r => r.ok ? r.json() : Promise.reject("Failed")),
      fetch(`${API_BASE}/partner-portal/dashboard`, { headers: h }).then(r => r.ok ? r.json() : Promise.reject("Failed")),
    ])
      .then(([m, d]) => { setMe(m); setDash(d); })
      .catch(() => {
        localStorage.removeItem("kemraa_portal_token");
        localStorage.removeItem("kemraa_portal_user");
        router.push("/portal/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("kemraa_portal_token");
    localStorage.removeItem("kemraa_portal_user");
    router.push("/portal/login");
  };

  const fmt = (minor: number) => `EGP ${(minor / 100).toLocaleString("en-EG", { minimumFractionDigits: 2 })}`;

  const uploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocBusy(true);
    try {
      const token = localStorage.getItem("kemraa_portal_token");
      const res = await fetch(`${API_BASE}/partner-portal/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(docForm),
      });
      if (!res.ok) throw new Error("Upload failed");
      // Reload
      const h = { Authorization: `Bearer ${token}` };
      const m = await fetch(`${API_BASE}/partner-portal/me`, { headers: h }).then(r => r.json());
      setMe(m);
      setDocForm({ docType: "LICENSE", fileName: "", fileUrl: "", fileSize: 0, notes: "" });
      alert("Document uploaded successfully!");
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally { setDocBusy(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="animate-spin text-[#C9A227]" size={40} />
    </div>
  );

  if (!me || !dash || !user) return null;

  const statCards = [
    { label: "Total Bookings", value: dash.totalBookings, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Drivers", value: dash.totalDrivers, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Vehicles", value: dash.totalVehicles, icon: Car, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Settlements", value: dash.totalSettlements, icon: Receipt, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Documents", value: dash.totalDocuments, icon: FileText, color: "text-gray-600", bg: "bg-gray-100" },
    { label: "Total Revenue", value: fmt(dash.totalRevenueMinor), icon: DollarSign, color: "text-[#C9A227]", bg: "bg-amber-50" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#E6C55C] flex items-center justify-center">
              <Building2 size={20} className="text-[#0C0A06]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">{me.organization.displayName}</h1>
              <p className="text-xs text-gray-600">Partner Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-600">{user.organizationName}</p>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-300">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon size={16} className={s.color} />
              </div>
              <p className="text-xs text-gray-600 uppercase tracking-wider">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
          <div className="border-b border-gray-300 flex">
            {(["overview", "bookings", "drivers", "vehicles", "documents"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium capitalize transition ${
                  tab === t
                    ? "text-[#C9A227] border-b-2 border-[#C9A227]"
                    : "text-gray-600 hover:text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Welcome, {user.email}</h2>
                  <p className="text-sm text-gray-600">
                    Your partnership with <strong>{me.organization.legalName}</strong> is active.
                    Use this portal to manage your bookings, drivers, vehicles, and documents.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                    <TrendingUp size={20} className="text-[#C9A227] mb-2" />
                    <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
                    <p className="text-xs text-gray-600 mt-1">{dash.totalBookings} total bookings processed</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <Receipt size={20} className="text-blue-600 mb-2" />
                    <p className="text-sm font-semibold text-gray-900">Pending Settlements</p>
                    <p className="text-xs text-gray-600 mt-1">{dash.totalSettlements} settlements in system</p>
                  </div>
                </div>
              </div>
            )}

            {tab === "bookings" && (
              <div className="text-center py-8 text-gray-600">
                <Package size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Bookings will appear here once customers book your services.</p>
                <p className="text-xs mt-1">{dash.totalBookings} total bookings</p>
              </div>
            )}

            {tab === "drivers" && (
              <div>
                {me.drivers.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Users size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No drivers assigned yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {me.drivers.map((d: any) => (
                      <div key={d.userId} className="p-3 border border-gray-300 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{d.user?.email}</p>
                          <p className="text-xs text-gray-600">Status: {d.status} · Rating: {d.rating ?? "N/A"}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${d.status === "ONLINE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "vehicles" && (
              <div>
                {me.vehicles.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Car size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No vehicles in fleet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {me.vehicles.map((v: any) => (
                      <div key={v.id} className="p-3 border border-gray-300 rounded-lg">
                        <p className="font-semibold text-sm">{v.make} {v.model}</p>
                        <p className="text-xs text-gray-600">{v.year} · {v.plateRef} · Capacity: {v.capacity}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "documents" && (
              <div className="space-y-4">
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Upload size={16} /> Upload Document
                  </h3>
                  <form onSubmit={uploadDoc} className="grid grid-cols-2 gap-3">
                    <select value={docForm.docType} onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}
                      className="px-3 py-2 border rounded-lg bg-white text-sm">
                      <option>LICENSE</option>
                      <option>CONTRACT</option>
                      <option>INSURANCE</option>
                      <option>TAX</option>
                      <option>OTHER</option>
                    </select>
                    <input placeholder="File Name" value={docForm.fileName}
                      onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" required />
                    <input placeholder="File URL" value={docForm.fileUrl}
                      onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
                      className="col-span-2 px-3 py-2 border rounded-lg text-sm" required />
                    <input type="number" placeholder="File Size (bytes)" value={docForm.fileSize || ""}
                      onChange={(e) => setDocForm({ ...docForm, fileSize: parseInt(e.target.value) || 0 })}
                      className="px-3 py-2 border rounded-lg text-sm" required />
                    <input placeholder="Notes (optional)" value={docForm.notes}
                      onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                    <button type="submit" disabled={docBusy}
                      className="col-span-2 py-2 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                      {docBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Upload
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Your Documents ({me.documents.length})</h3>
                  {me.documents.length === 0 ? (
                    <p className="text-sm text-gray-600 py-4">No documents uploaded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {me.documents.map((d: any) => (
                        <div key={d.id} className="p-3 border border-gray-300 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{d.fileName}</p>
                            <p className="text-xs text-gray-600">{d.docType} · {new Date(d.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{d.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
