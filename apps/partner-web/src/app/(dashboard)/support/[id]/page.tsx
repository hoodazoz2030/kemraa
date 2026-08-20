"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerSupportApi } from "@/lib/api";
import { ArrowLeft, Send, Loader2 } from "lucide-react";

export default function SupportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: t, isLoading } = useQuery({ queryKey: ["ticket", id], queryFn: () => partnerSupportApi.detail(id) });
  const replyMut = useMutation({
    mutationFn: (b: string) => partnerSupportApi.reply(id, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ticket", id] }); setBody(""); },
  });

  if (isLoading) return <div className="text-kemraa-text/60 py-12 text-center">Loading ticket...</div>;
  if (!t) return <div className="text-red-400 py-12 text-center">Ticket not found</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/support" className="inline-flex items-center gap-2 text-kemraa-text/60 hover:text-kemraa-gold transition text-sm">
        <ArrowLeft size={16} /> Back to Support
      </Link>

      <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
        <div className="mb-4">
          <div className="text-xs text-kemraa-goldDark mb-2 uppercase tracking-wider">{t.category} · {t.priority}</div>
          <h1 className="text-2xl font-bold text-kemraa-gold">{t.subject}</h1>
          <div className="text-xs text-kemraa-text/50 mt-1">Opened {new Date(t.createdAt).toLocaleString()}</div>
        </div>
        <p className="text-kemraa-text/80 whitespace-pre-wrap">{t.body}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-kemraa-gold font-semibold tracking-wider">Conversation ({t.replies?.length ?? 0})</h2>
        {(t.replies ?? []).map((r: any) => (
          <div key={r.id} className={`rounded-xl p-5 ${r.isStaff ? "bg-kemraa-goldDark/10 border border-kemraa-goldDark/30 ml-8" : "bg-kemraa-darkAlt border border-kemraa-goldDark/20 mr-8"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-xs font-semibold ${r.isStaff ? "text-kemraa-gold" : "text-kemraa-text"}`}>{r.isStaff ? "KEMRAA Support" : "You"}</div>
              <div className="text-xs text-kemraa-text/50">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <p className="text-sm text-kemraa-text/80 whitespace-pre-wrap">{r.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) replyMut.mutate(body.trim()); }} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-xl p-4 flex gap-3">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your reply..." className="flex-1 px-4 py-2.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
        <button type="submit" disabled={!body.trim() || replyMut.isPending} className="px-5 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
          {replyMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Send
        </button>
      </form>
    </div>
  );
}