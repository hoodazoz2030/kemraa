"use client";
import { useEffect, useRef, useState } from "react";
import { thothChatApi } from "@/lib/api";
import { MessageCircle, Send, Loader2, Bot, User, ShieldAlert, Activity } from "lucide-react";
import clsx from "clsx";

export default function ThothChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    thothChatApi.stats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg, createdAt: new Date().toISOString() }]);
    setBusy(true);
    try {
      const r = await thothChatApi.chat(userMsg, sessionId ?? undefined);
      if (r.sessionId) setSessionId(r.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: r.reply,
          toolCalls: r.toolCalls,
          toolResults: r.toolResults,
          riskLevel: r.riskLevel,
          createdAt: new Date().toISOString(),
        },
      ]);
      // Refresh stats
      thothChatApi.stats().then(setStats).catch(() => {});
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${e?.message}`, createdAt: new Date().toISOString() }]);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setSessionId(null);
  };

  const riskColor = (r: string) =>
    r === "LOW" ? "text-green-700" : r === "MEDIUM" ? "text-yellow-700" : r === "HIGH" ? "text-orange-700" : r === "CRITICAL" ? "text-red-700" : "text-gray-600";

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-300 overflow-hidden">
        <div className="p-4 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle size={22} className="text-[#C9A227]" /> THOTH Chat
            </h1>
            <p className="text-xs text-gray-700 mt-0.5">
              Session: <span className="font-mono">{sessionId?.slice(0, 8) ?? "new"}</span>
            </p>
          </div>
          <button onClick={reset} className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            New Session
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 py-12">
              <Bot size={48} className="mx-auto mb-3 text-[#C9A227]" />
              <p className="font-semibold">ابدأ محادثة مع THOTH</p>
              <p className="text-sm mt-1">جرب: "ابحث عن فنادق" / "احسب الميزانية" / "احجز رحلة"</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={clsx("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] flex items-center justify-center shrink-0">
                  <Bot size={18} className="text-[#0C0A06]" />
                </div>
              )}
              <div className={clsx("max-w-[75%] rounded-2xl px-4 py-2.5", m.role === "user" ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]" : "bg-white border border-gray-300 text-gray-900")}>
                {m.riskLevel && (
                  <p className={clsx("text-[10px] font-bold uppercase mb-1", riskColor(m.riskLevel))}>
                    {m.riskLevel}
                  </p>
                )}
                <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                {m.toolCalls?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-[10px] font-bold text-gray-600 uppercase">Tools called:</p>
                    {m.toolCalls.map((t: any, j: number) => (
                      <div key={j} className="mt-1 text-xs font-mono bg-gray-100 rounded px-2 py-1">
                        {t.tool} {t.status ? `(${t.status})` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  <User size={18} className="text-white" />
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A227] to-[#E6C55C] flex items-center justify-center shrink-0">
                <Bot size={18} className="text-[#0C0A06]" />
              </div>
              <div className="bg-white border border-gray-300 rounded-2xl px-4 py-3">
                <Loader2 className="animate-spin text-[#C9A227]" size={18} />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={send} className="p-3 border-t border-gray-300 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك... (مثال: ابحث عن فنادق)"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()} className="px-4 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-bold disabled:opacity-50">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>

      {/* Stats sidebar */}
      <div className="w-80 space-y-3 overflow-y-auto">
        <div className="bg-white p-4 rounded-xl border border-gray-300">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Activity size={16} /> Stats
          </h3>
          {stats ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Total messages</span>
                <span className="font-bold">{stats.total}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">By status</p>
                {Object.entries(stats.byStatus ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-700">{k}</span>
                    <span className="font-mono">{v as number}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">By risk</p>
                {Object.entries(stats.byRisk ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className={riskColor(k)}>{k}</span>
                    <span className="font-mono">{v as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Loader2 className="animate-spin mx-auto" size={20} />
          )}
        </div>

        <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-900">
          <p className="font-bold flex items-center gap-1 mb-1"><ShieldAlert size={14} /> Policy Engine</p>
          <ul className="space-y-1 list-disc pl-4">
            <li>LOW: execute directly</li>
            <li>MEDIUM: approval at confirmation</li>
            <li>HIGH: explicit approval required</li>
            <li>CRITICAL: SUPER_ADMIN only</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
