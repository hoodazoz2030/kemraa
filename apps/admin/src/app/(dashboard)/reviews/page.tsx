"use client";
import { useEffect, useState } from "react";
import { reviewsApi, type Review } from "@/lib/api";
import { Star, Loader2, Check, EyeOff, Trash2, Filter } from "lucide-react";
import clsx from "clsx";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ targetType: "", minRating: "", maxRating: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([reviewsApi.list(filter), reviewsApi.stats()]);
      setReviews(r.items); setTotal(r.total); setStats(s);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter.targetType, filter.minRating, filter.maxRating]);

  const act = async (id: string, action: "approve" | "hide" | "delete") => {
    if (action === "delete" && !confirm("Delete this review permanently?")) return;
    await reviewsApi[action](id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Star size={24} className="text-[#C9A227]" /> Reviews Moderation
        </h1>
        <p className="text-sm text-gray-600 mt-1">Manage customer feedback across services, trips, and drivers</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Average</p>
            <p className="text-2xl font-bold text-[#C9A227]">{Number(stats.average).toFixed(1)} ★</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-300 col-span-2">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Distribution</p>
            <div className="flex gap-2 items-end h-10">
              {[5, 4, 3, 2, 1].map((r) => {
                const row: any = stats.byRating?.find((x: any) => x.rating === r);
                const count = Number(row?.count ?? 0);
                const max = Math.max(...(stats.byRating?.map((x: any) => Number(x.count)) ?? [1]), 1);
                const pct = (count / max) * 100;
                return (
                  <div key={r} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gray-100 rounded-t relative" style={{ height: "32px" }}>
                      <div className="absolute bottom-0 w-full bg-[#C9A227] rounded-t" style={{ height: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-600">{r}★</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-300 p-4 flex gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Target</label>
          <select value={filter.targetType} onChange={(e) => setFilter({ ...filter, targetType: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
            <option value="">All</option><option>SERVICE</option><option>TRIP</option><option>DRIVER</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Min Rating</label>
          <input type="number" min="1" max="5" value={filter.minRating}
            onChange={(e) => setFilter({ ...filter, minRating: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-20" placeholder="1" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Max Rating</label>
          <input type="number" min="1" max="5" value={filter.maxRating}
            onChange={(e) => setFilter({ ...filter, maxRating: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-20" placeholder="5" />
        </div>
        <button onClick={load} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5">
          <Filter size={14} /> Apply
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-700"><Loader2 className="animate-spin mx-auto" size={24} /></div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-gray-600"><Star size={40} className="mx-auto mb-3 text-gray-300" />No reviews yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b text-left text-xs uppercase tracking-wider text-gray-800">
              <tr>
                <th className="px-4 py-3">Reviewer</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map((r) => {
                const name = [r.reviewer?.profile?.firstName, r.reviewer?.profile?.lastName].filter(Boolean).join(" ") || r.reviewer?.email || "—";
                return (
                  <tr key={r.id} className="hover:bg-gray-100/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-bold text-xs flex items-center justify-center">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{name}</p>
                          <p className="text-xs text-gray-600" dir="ltr">{r.reviewer?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="fill-[#C9A227] text-[#C9A227]" />
                        <span className="font-semibold">{r.rating}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{r.targetType}</span>
                      <p className="text-xs text-gray-600 mt-0.5">{r.booking?.service?.title ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-700 truncate">{r.comment ?? <span className="italic text-gray-700">(no comment)</span>}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => act(r.id, "approve")} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Approve"><Check size={15} /></button>
                        <button onClick={() => act(r.id, "hide")} className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600" title="Hide"><EyeOff size={15} /></button>
                        <button onClick={() => act(r.id, "delete")} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
