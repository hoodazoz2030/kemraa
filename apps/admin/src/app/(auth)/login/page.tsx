"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffApi, setTokens } from "@/lib/api";
import { Loader2, KeyRound } from "lucide-react";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("kemraa_device_id");
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("kemraa_device_id", id);
  }
  return id;
}

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const deviceId = getDeviceId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError("");
    try {
      const r = await staffApi.accessLogin(code.trim(), deviceId);
      setTokens(r.accessToken, r.refreshToken);
      localStorage.setItem("access_token", r.accessToken);
      localStorage.setItem("refresh_token", r.refreshToken);
      localStorage.setItem("kemraa_features", JSON.stringify(r.user.features ?? []));
      localStorage.setItem("kemraa_user", JSON.stringify(r.user));
      localStorage.setItem("kemraa_features", JSON.stringify(r.user.features ?? []));
      localStorage.setItem("kemraa_user", JSON.stringify(r.user));
      window.location.href = "/";
    } catch (e: any) {
      const c = e?.response?.data?.code;
      const msg = e?.response?.data?.message;
      if (c === "CODE_LOCKED") setError(msg || "Account locked temporarily");
      else if (c === "ACCOUNT_SUSPENDED") setError("This account has been suspended");
      else setError("Invalid access code");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: "linear-gradient(rgba(12,10,6,0.45), rgba(12,10,6,0.65)), url('/login-bg.png') center/cover no-repeat, #0C0A06" }}>
      <div className="w-full max-w-md bg-[#0C0A06]/85 backdrop-blur-sm border border-[#C9A227]/40 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          {"" !== "/logo-dark.png" ? (
            <img src="/logo-dark.png" alt="Kemraa" className="w-24 h-24 rounded-full border-2 border-[#C9A227]/60 mx-auto mb-4 shadow-[0_0_30px_rgba(201,162,39,0.35)]" />
          ) : (
            <div className="w-24 h-24 rounded-full border-2 border-[#C9A227]/60 bg-gradient-to-br from-[#C9A227] to-[#8C6D1F] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(201,162,39,0.35)]">
              <span className="text-3xl">🏺</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-[#E6C55C] tracking-[0.35em]">KEMRAA</h1>
          <p className="text-[11px] text-[#C9A227] tracking-[0.45em] mt-2">THE LAND OF THE SUN</p>
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C9A227]/50" />
          <span className="text-[#C9A227] text-sm">☀</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C9A227]/50" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-[#E6C55C] mb-2 tracking-wider">ACCESS CODE</label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C9A227]" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                autoComplete="off"
                dir="ltr"
                placeholder="krt•••••"
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-[#C9A227]/40 rounded-lg text-xl text-[#E6C55C] font-mono tracking-[0.2em] placeholder:text-gray-600 focus:outline-none focus:border-[#E6C55C] focus:ring-2 focus:ring-[#C9A227]/20"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={busy || !code.trim()}
            className="w-full py-4 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 transition text-base tracking-wider">
            {busy ? <Loader2 className="animate-spin" size={20} /> : <>ENTER 🏺</>}
          </button>
        </form>

        <p className="text-center text-[10px] text-[#C9A227]/60 tracking-[0.35em] mt-8">POWERED BY THOTH</p>
      </div>
    </div>
  );
}