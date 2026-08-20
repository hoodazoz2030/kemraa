"use client";
import { useQuery } from "@tanstack/react-query";
import { partnerReviewsApi } from "@/lib/api";
import { Star } from "lucide-react";

export default function ReviewsPage() {
  const stats = useQuery({ queryKey: ["review-stats"], queryFn: () => partnerReviewsApi.stats() });
  const list = useQuery({ queryKey: ["review-list"], queryFn: () => partnerReviewsApi.list() });
  const st = stats.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Reviews</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Customer feedback on your services (read-only)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6 text-center">
          <div className="text-5xl font-bold text-kemraa-gold mb-2">{st?.average ?? 0}</div>
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={20} className={i <= Math.round(st?.average ?? 0) ? "text-kemraa-gold fill-kemraa-gold" : "text-kemraa-text/20"} />
            ))}
          </div>
          <div className="text-sm text-kemraa-text/60">{st?.count ?? 0} reviews</div>
          <div className="mt-5 space-y-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = st?.distribution?.[n] ?? 0;
              const pct = st?.count ? Math.round((c / st.count) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-kemraa-text/60">{n}</span>
                  <Star size={12} className="text-kemraa-gold" />
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold" style={{ width: `${pct}%` }} /></div>
                  <span className="w-8 text-right text-kemraa-text/60">{c}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {list.isLoading ? (
            <div className="text-kemraa-text/60 py-12 text-center">Loading reviews...</div>
          ) : (list.data?.items ?? []).length === 0 ? (
            <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No reviews yet.</div>
          ) : (
            (list.data?.items ?? []).map((r: any) => (
              <div key={r.id} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={i <= r.rating ? "text-kemraa-gold fill-kemraa-gold" : "text-kemraa-text/20"} />)}
                    </div>
                    <span className="text-xs text-kemraa-text/50">{r.reviewer?.email ?? r.reviewer?.username ?? "Customer"}</span>
                  </div>
                  <span className="text-xs text-kemraa-text/50">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-sm text-kemraa-text/80">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}