"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffApi, api, setTokens } from "@/lib/api";
import { Shield, Loader2, Mail, Lock, User, ArrowRight, Fingerprint } from "lucide-react";

type Stage = "credentials" | "otp";

export default function StaffLoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<{ userId: string; fingerprint: string; deviceName: string; username: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true); setError("");
    try {
      const r = await staffApi.login(username.trim(), password);
      if (r.needsOtp) {
        setPending({ userId: r.userId, fingerprint: r.fingerprint, deviceName: r.deviceName, username: r.username });
        setStage("otp");
      } else {
        // Device trusted — skip OTP
        await finalize(r.userId, r.fingerprint, r.deviceName);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Invalid username or password");
    } finally { setBusy(false); }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || code.length !== 6) return;
    setBusy(true); setError("");
    try {
      const r = await staffApi.verifyOtp(pending.userId, code.trim(), pending.fingerprint, pending.deviceName);
      setTokens(r.accessToken, r.refreshToken);
      router.push("/");
    } catch (e: any) {
      setError("Invalid code");
    } finally { setBusy(false); }
  };

  const finalize = async (userId: string, fingerprint: string, deviceName: string) => {
    // Auto-verify with placeholder — only works if device is already trusted
    try {
      const r = await staffApi.verifyOtp(userId, "000000", fingerprint, deviceName);
      setTokens(r.accessToken, r.refreshToken);
      router.push("/");
    } catch {
      // fallback — request real OTP via email
      await api.post("/auth/otp/request", { identifier: pending?.username ?? username, channel: "EMAIL" });
      setStage("otp");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#FAF7EF] via-[#F0D78C]/20 to-[#E6C55C]/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#E6C55C] mb-4 shadow-lg">
            <Shield className="text-[#0C0A06]" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Kemraa</h1>
          <p className="text-sm text-[#8C6D1F] mt-1 tracking-widest">STAFF PORTAL</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-[#C9A227]/20 p-8">
          {stage === "credentials" && (
            <form onSubmit={handleCredentials} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Staff Login</h2>
                <p className="text-xs text-gray-500">Enter your staff credentials</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="owner"
                    autoFocus
                    dir="ltr"
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={busy || !username || !password}
                className="w-full py-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 transition"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <>Continue <ArrowRight size={16} /></>}
              </button>

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full py-2 text-sm text-gray-500 hover:text-[#8C6D1F] flex items-center justify-center gap-1.5"
                >
                  <Mail size={14} /> Login as Traveler (OTP only)
                </button>
              </div>
            </form>
          )}

          {stage === "otp" && pending && (
            <form onSubmit={handleOtp} className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-[#8C6D1F] text-xs font-semibold uppercase tracking-wider mb-2">
                  <Fingerprint size={14} /> New device detected
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Verify your identity</h2>
                <p className="text-xs text-gray-500">
                  We sent a 6-digit code to your email. After this login, this device will be trusted.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  autoFocus
                  dir="ltr"
                  className="w-full px-4 py-4 border border-gray-200 rounded-lg text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <>Verify & Sign In <ArrowRight size={16} /></>}
              </button>

              <button
                type="button"
                onClick={() => { setStage("credentials"); setCode(""); setError(""); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to credentials
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Kemraa • The Land of the Sun
        </p>
      </div>
    </div>
  );
}