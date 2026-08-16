"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffApi, setTokens } from "@/lib/api";
import { Loader2, Mail, Lock, User, ShieldCheck, KeyRound } from "lucide-react";

function getDeviceId(): string {
  let id = localStorage.getItem("kemraa_device_id");
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("kemraa_device_id", id);
  }
  return id;
}

type Stage = "email" | "otp" | "creds";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [preToken, setPreToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const deviceId = typeof window !== "undefined" ? getDeviceId() : "";

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await staffApi.checkDevice(email.trim(), deviceId);
      if (!r.needsOtp) {
        setStage("creds");
      } else {
        setStage("otp");
      }
    } catch (e: any) { setError("Something went wrong"); }
    finally { setBusy(false); }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await staffApi.verifyOtp(email.trim(), code.trim(), deviceId, navigator.userAgent);
      setPreToken(r.preToken);
      setStage("creds");
    } catch { setError("Invalid or expired code"); }
    finally { setBusy(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await staffApi.login(username.trim(), password, deviceId, preToken || undefined);
      setTokens(r.accessToken, r.refreshToken);
      localStorage.setItem("kemraa_features", JSON.stringify(r.user.features ?? []));
      localStorage.setItem("kemraa_user", JSON.stringify(r.user));
      router.push("/");
    } catch (e: any) {
      const c = e?.response?.data?.code;
      setError(c === "OTP_REQUIRED" ? "Device verification required" : "Invalid username or password");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: "linear-gradient(rgba(12,10,6,0.55), rgba(12,10,6,0.75)), url('/login-bg.png') center/cover no-repeat, #0C0A06" }}>
      <div className="w-full max-w-md bg-[#0C0A06]/85 backdrop-blur border border-[#C9A227]/40 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#E6C55C] tracking-[0.3em]">KEMRAA</h1>
          <p className="text-xs text-[#C9A227] tracking-[0.4em] mt-2">THE LAND OF THE SUN</p>
        </div>

        {stage === "email" && (
          <form onSubmit={handleEmail} className="space-y-5">
            <div>
              <label className="block text-sm text-[#E6C55C] mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A227]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus dir="ltr"
                  placeholder="you@kemraa.com"
                  className="w-full pl-10 pr-3 py-3 bg-white/10 border border-[#C9A227]/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E6C55C]" />
              </div>
            </div>
            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={busy || !email}
              className="w-full py-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> Continue</>}
            </button>
          </form>
        )}

        {stage === "otp" && (
          <form onSubmit={handleOtp} className="space-y-5">
            <div className="text-center text-sm text-[#C9A227]">
              New device detected - a code was sent to <span dir="ltr" className="text-[#E6C55C] font-semibold">{email}</span>
            </div>
            <div>
              <label className="block text-sm text-[#E6C55C] mb-2">Verification Code</label>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus dir="ltr"
                placeholder="••••••"
                className="w-full px-4 py-4 bg-white/10 border border-[#C9A227]/40 rounded-lg text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-[#E6C55C]" />
            </div>
            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={busy || code.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <><KeyRound size={18} /> Verify Device</>}
            </button>
          </form>
        )}

        {stage === "creds" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-[#E6C55C] mb-2">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A227]" />
                <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus dir="ltr"
                  className="w-full pl-10 pr-3 py-3 bg-white/10 border border-[#C9A227]/40 rounded-lg text-white focus:outline-none focus:border-[#E6C55C]" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#E6C55C] mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A227]" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr"
                  className="w-full pl-10 pr-3 py-3 bg-white/10 border border-[#C9A227]/40 rounded-lg text-white focus:outline-none focus:border-[#E6C55C]" />
              </div>
            </div>
            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={busy || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Sign In"}
            </button>
          </form>
        )}

        <p className="text-center text-[10px] text-[#C9A227]/60 tracking-[0.3em] mt-8">POWERED BY THOTH</p>
      </div>
    </div>
  );
}