"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, setTokens } from "@/lib/api";
import { Loader2 } from "lucide-react";

type Stage = "request" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("request");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setBusy(true); setError("");
    try {
      await authApi.requestOtp(identifier.trim(), channel);
      setStage("verify");
    } catch (e: any) {
      setError("Failed to send OTP. Try again.");
    } finally { setBusy(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) return;
    setBusy(true); setError("");
    try {
      const { data } = await authApi.verifyOtp(identifier.trim(), channel, code.trim());
      setTokens(data.accessToken, data.refreshToken);
      if (data.user?.roles) {
        localStorage.setItem("kemraa_roles", JSON.stringify(data.user.roles));
      }
      router.push("/");
    } catch (e: any) {
      setError("Invalid or expired code. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: "linear-gradient(rgba(12,10,6,0.45), rgba(12,10,6,0.65)), url('/login-bg.png') center/cover no-repeat, #0C0A06" }}>

      <div className="w-full max-w-md bg-[#0C0A06]/80 backdrop-blur-sm border border-[#C9A227]/30 rounded-2xl p-8 shadow-2xl">

        {/* Logo */}
        <div className="flex justify-center mb-5">
          {"" !== "/logo-dark.png" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo-dark.png" alt="Kemraa" className="w-24 h-24 rounded-full border-2 border-[#C9A227]/60 shadow-[0_0_30px_rgba(201,162,39,0.35)]" />
          ) : (
            <div className="w-24 h-24 rounded-full border-2 border-[#C9A227]/60 bg-gradient-to-br from-[#C9A227] to-[#8C6D1F] flex items-center justify-center shadow-[0_0_30px_rgba(201,162,39,0.35)]">
              <span className="text-3xl">🏺</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-center text-2xl font-bold text-[#E6C55C] tracking-[0.35em]">KEMRAA</h1>
        <p className="text-center text-[11px] text-[#C9A227] tracking-[0.45em] mt-2">THE LAND OF THE SUN</p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C9A227]/50" />
          <span className="text-[#C9A227] text-sm">☀</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C9A227]/50" />
        </div>

        {stage === "request" && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm text-[#E6C55C] mb-2">Email or Phone</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                dir="ltr"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#E6C55C] mb-2">Channel</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel("EMAIL")}
                  className={channel === "EMAIL"
                    ? "py-3 rounded-lg font-semibold bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]"
                    : "py-3 rounded-lg font-semibold bg-white/5 text-gray-300 border border-[#C9A227]/20 hover:bg-white/10"}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("SMS")}
                  className={channel === "SMS"
                    ? "py-3 rounded-lg font-semibold bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]"
                    : "py-3 rounded-lg font-semibold bg-white/5 text-gray-300 border border-[#C9A227]/20 hover:bg-white/10"}
                >
                  SMS
                </button>
              </div>
            </div>

            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}

            <button
              type="submit"
              disabled={busy || !identifier.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 transition"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Send OTP"}
            </button>
          </form>
        )}

        {stage === "verify" && (
          <form onSubmit={handleVerify} className="space-y-5">
            <p className="text-center text-sm text-[#C9A227]">
              We sent a code to <span dir="ltr" className="text-[#E6C55C] font-semibold">{identifier}</span>
            </p>
            <div>
              <label className="block text-sm text-[#E6C55C] mb-2">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
                dir="ltr"
                placeholder="••••••"
                className="w-full px-4 py-4 bg-white/10 border border-[#C9A227]/40 rounded-lg text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-[#E6C55C]"
              />
            </div>

            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}

            <button
              type="submit"
              disabled={busy || code.length < 4}
              className="w-full py-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={() => { setStage("request"); setCode(""); setError(""); }}
              className="w-full py-2 text-sm text-gray-400 hover:text-[#E6C55C]"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="text-center text-[10px] text-[#C9A227]/60 tracking-[0.35em] mt-8">POWERED BY THOTH</p>
      </div>
    </div>
  );
}