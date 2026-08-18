"use client";
import { useEffect, useState } from "react";
import { partnersApi, contractsApi, portalApi, type Partner } from "@/lib/api";
import { Building2, Loader2, Plus, X, Save, Search, Check, Ban, Eye, FileDown, UserPlus, Key } from "lucide-react";
import clsx from "clsx";

const TYPES = [
  { value: "HOTEL", label: "🏨 Hotel" },
  { value: "TOUR_OPERATOR", label: "🗺️ Tour Operator" },
  { value: "TRANSPORT", label: "🚗 Transport" },
  { value: "AGENCY", label: "🏢 Travel Agency" },
];

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "", status: "", search: "" });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState({
    legalName: "", displayName: "", type: "HOTEL", country: "EG",
    partnerType: "HOTEL", settlementTerms: "{}",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [portalModal, setPortalModal] = useState<Partner | null>(null);
  const [portalForm, setPortalForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalResult, setPortalResult] = useState<any>(null);
  const [portalError, setPortalError] = useState("");

  const openPortalModal = (p: Partner) => {
    setPortalModal(p);
    setPortalForm({ email: "", password: "Portal123!", firstName: "", lastName: "" });
    setPortalResult(null);
    setPortalError("");
  };

  const createPortalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalModal) return;
    setPortalBusy(true);
    setPortalError("");
    try {
      const result = await portalApi.createPartnerUser({
        partnerId: portalModal.id,
        ...portalForm,
      });
      setPortalResult(result);
    } catch (err: any) {
      setPortalError(err?.response?.data?.message || err?.message || "Failed to create");
    } finally {
      setPortalBusy(false);
    }
  };
  const [downloading, setDownloading] = useState(false);
  const downloadContract = async (p: any) => {
    setDownloading(true);
    try {
      await contractsApi.downloadPartnerPdf(p.id, p.displayName);
    } catch (e: any) {
      alert("Failed to download: " + (e?.message || e));
    } finally { setDownloading(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([partnersApi.list(filter), partnersApi.stats()]);
      setPartners(p.items); setTotal(p.total); setStats(s);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter.type, filter.status]);

  const openCreate = () => {
    setEditing(null);
    setForm({ legalName: "", displayName: "", type: "HOTEL", country: "EG", partnerType: "HOTEL", settlementTerms: "{}" });
    setError("");
    setModal(true);
  };
  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm({
      legalName: p.legalName, displayName: p.displayName, type: p.type, country: p.country,
      partnerType: p.partner?.partnerType ?? p.type,
      settlementTerms: JSON.stringify(p.partner?.settlementTerms ?? {}, null, 2),
    });
    setError("");
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      let terms = {};
      try { terms = JSON.parse(form.settlementTerms); } catch { throw new Error("settlementTerms must be valid JSON"); }
      if (editing) await partnersApi.update(editing.id, { ...form, settlementTerms: terms });
      else await partnersApi.create({ ...form, settlementTerms: terms });
      setModal(false);
      await load();
    } catch (e: any) { setError(e?.message || e?.response?.data?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const activate = async (p: Partner) => {
    if (!confirm(`Activate ${p.displayName}?`)) return;
    await partnersApi.activate(p.id);
    await load();
  };
  const suspend = async (p: Partner) => {
    if (!confirm(`Suspend ${p.displayName}?`)) return;
    await partnersApi.suspend(p.id);
    await load();
  };
  const viewDetail = async (p: Partner) => {
    const d = await partnersApi.detail(p.id);
    setDetail(d);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={24} className="text-[#C9A227]" /> Partners
          </h1>
          <p className="text-sm text-gray-600 mt-1">{total} partners • Hotels, tour operators, transport</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold flex items-center gap-2">
          <Plus size={18} /> New Partner
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Draft</p>
            <p className="text-2xl font-bold text-orange-600">{stats.draft}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-4 gap-3">
        <div className="col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filter.search}
            onChange={(e) => { setFilter({ ...filter, search: e.target.value }); setTimeout(load, 300); }}
            placeholder="Search by name..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <select value={filter.type} onChange={(e) => { setFilter({ ...filter, type: e.target.value }); load(); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => { setFilter({ ...filter, status: e.target.value }); load(); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          <option value="">All Status</option>
          <option>DRAFT</option><option>ACTIVE</option><option>EXPIRED</option><option>TERMINATED</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center text-gray-600"><Building2 size={40} className="mx-auto mb-3 text-gray-300" />No partners yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-left text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Stats</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {partners.map((p) => {
                const isActive = p.status === "ACTIVE";
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-sm flex items-center justify-center">
                          {p.displayName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{p.displayName}</p>
                          <p className="text-xs text-gray-600">{p.legalName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{p.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold",
                        isActive ? "bg-green-100 text-green-700" :
                        p.status === "DRAFT" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-600")}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 text-xs text-gray-600">
                        <span>🚗 {p.partner?._count?.vehicles ?? 0}</span>
                        <span>👥 {p.partner?._count?.drivers ?? 0}</span>
                        <span>📦 {p.partner?._count?.services ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.country}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => viewDetail(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View"><Eye size={15} /></button>
                        {!isActive ? (
                          <button onClick={() => activate(p)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Activate"><Check size={15} /></button>
                        ) : (
                          <button onClick={() => suspend(p)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Suspend"><Ban size={15} /></button>
                        )}
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Edit">✏️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? "Edit Partner" : "New Partner"}</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Legal Name *</label>
                  <input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#C9A227]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Display Name *</label>
                  <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#C9A227]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, partnerType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white">
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Country</label>
                  <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" maxLength={2} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Partner Type</label>
                  <input value={form.partnerType} onChange={(e) => setForm({ ...form, partnerType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Settlement Terms (JSON)</label>
                <textarea value={form.settlementTerms} onChange={(e) => setForm({ ...form, settlementTerms: e.target.value })}
                  rows={4} className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                  placeholder='{"markup_bps": 1000, "payment_days": 30}' />
              </div>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <button type="submit" disabled={busy}
                className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editing ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}

            {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-[#C9A227]">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{detail.displayName}</h3>
                <p className="text-sm text-gray-600 mt-0.5">Partner Details</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-800" title="Close">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Legal Name</p>
                <p className="font-semibold text-gray-900">{detail.legalName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Type</p>
                <p className="font-semibold text-gray-900">{detail.type}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Status</p>
                <p className="font-semibold text-gray-900">{detail.status}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Country</p>
                <p className="font-semibold text-gray-900">{detail.country}</p>
              </div>
              <div className="col-span-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Settlement Terms</p>
                <pre className="text-xs font-mono text-gray-900 overflow-x-auto">{JSON.stringify(detail.partner?.settlementTerms ?? {}, null, 2)}</pre>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-bold text-blue-700 uppercase">Vehicles</p>
                <p className="text-2xl font-bold text-blue-900">{detail.partner?.vehicles?.length ?? 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-bold text-green-700 uppercase">Drivers</p>
                <p className="text-2xl font-bold text-green-900">{detail.partner?.drivers?.length ?? 0}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs font-bold text-purple-700 uppercase">Services</p>
                <p className="text-2xl font-bold text-purple-900">{detail.partner?.services?.length ?? 0}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={() => downloadContract(detail)}
                disabled={downloading}
                className="w-full py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg transition"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Download Contract PDF
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setDetail(null); openEdit(detail); }}
                  className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  Edit Partner
                </button>
                <button
                  onClick={() => { setDetail(null); openPortalModal(detail); }}
                  className="py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  Create Portal User
                </button>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-1"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>
      )}

      {portalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Key size={20} className="text-purple-600" />
                Create Portal User for {portalModal.displayName}
              </h3>
              <button onClick={() => setPortalModal(null)} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>

            {portalResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 mb-2">Portal User Created!</p>
                  <p className="text-xs text-green-700">Share these credentials with the partner:</p>
                </div>
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Email:</span>
                    <code className="text-sm font-mono">{portalResult.user.email}</code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Access Code:</span>
                    <code className="text-sm font-mono text-purple-700">{portalResult.accessCode}</code>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Partner can login at: <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">/portal/login</code>
                </p>
                <button onClick={() => setPortalModal(null)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={createPortalUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">First Name</label>
                    <input value={portalForm.firstName} onChange={(e) => setPortalForm({ ...portalForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Last Name</label>
                    <input value={portalForm.lastName} onChange={(e) => setPortalForm({ ...portalForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Email *</label>
                  <input type="email" required value={portalForm.email} onChange={(e) => setPortalForm({ ...portalForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" placeholder="partner@company.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Password *</label>
                  <input type="text" required value={portalForm.password} onChange={(e) => setPortalForm({ ...portalForm, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono" />
                  <p className="text-xs text-gray-500 mt-1">Min 8 chars. Partner can use email+password or access code.</p>
                </div>
                {portalError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{portalError}</div>
                )}
                <button type="submit" disabled={portalBusy}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {portalBusy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Create Portal User
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
