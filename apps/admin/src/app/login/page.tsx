"use client";
import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

function WingedSun() {
  return (
    <svg viewBox="0 0 220 36" className="w-44 h-9 mx-auto mt-3" fill="none">
      <defs>
        <linearGradient id="wingGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C9A227" stopOpacity="0" />
          <stop offset="30%" stopColor="#C9A227" />
          <stop offset="50%" stopColor="#F0D78C" />
          <stop offset="70%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sunGold" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0%" stopColor="#F7E7A0" />
          <stop offset="60%" stopColor="#E6C55C" />
          <stop offset="100%" stopColor="#8C6D1F" />
        </radialGradient>
      </defs>

      {/* Left wing */}
      <path d="M96 17 C 70 9, 40 7, 8 11" stroke="url(#wingGold)" strokeWidth="2" />
      <path d="M96 19 C 72 15, 45 14, 14 17" stroke="url(#wingGold)" strokeWidth="1.6" />
      <path d="M96 21 C 74 21, 50 21, 22 23" stroke="url(#wingGold)" strokeWidth="1.2" />
      <path d="M96 23 C 76 26, 55 27, 30 28" stroke="url(#wingGold)" strokeWidth="0.8" />

      {/* Right wing */}
      <path d="M124 17 C 150 9, 180 7, 212 11" stroke="url(#wingGold)" strokeWidth="2" />
      <path d="M124 19 C 148 15, 175 14, 206 17" stroke="url(#wingGold)" strokeWidth="1.6" />
      <path d="M124 21 C 146 21, 170 21, 198 23" stroke="url(#wingGold)" strokeWidth="1.2" />
      <path d="M124 23 C 144 26, 165 27, 190 28" stroke="url(#wingGold)" strokeWidth="0.8" />

      {/* Sun disk */}
      <circle cx="110" cy="18" r="12" stroke="#C9A227" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="110" cy="18" r="9" fill="url(#sunGold)" stroke="#8C6D1F" strokeWidth="1" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("customer.ar@kemraa.local");
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.requestOtp(identifier, channel);
      setMessage("OTP sent! Check docker logs for the code.");
      setStep("verify");
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(identifier, channel, code);
      setMessage("✓ Welcome to the Land of the Sun!");
      setTimeout(() => router.replace("/"), 100);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const whiteInput =
    "w-full px-4 py-2.5 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A227] transition";

  const goldBtn =
    "w-full py-2.5 rounded-lg font-semibold text-[#0C0A06] bg-gradient-to-r from-[#C9A227] via-[#E6C55C] to-[#C9A227] hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(201,162,39,0.35)] transition";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0C0A06]">
      {/* ===== Thoth + Pyramids panorama ===== */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="absolute inset-0 bg-black/35" />

      {/* ===== Login card ===== */}
      <div className="max-w-sm w-full bg-[#160f06]/90 backdrop-blur-md rounded-2xl border border-[#C9A227]/40 p-6 shadow-[0_0_60px_rgba(201,162,39,0.25)] relative z-10">
        {/* Logo + title */}
        <div className="text-center">
          <Image
            src="/logo-dark.png"
            alt="Kemraa — The Land of the Sun"
            width={110}
            height={110}
            className="mx-auto rounded-full ring-1 ring-[#C9A227]/60 shadow-[0_0_45px_rgba(201,162,39,0.5)]"
          />
          <h1 className="mt-3 text-2xl font-bold tracking-[0.25em] text-[#E6C55C]">KEMRAA</h1>
          <p className="text-[11px] text-[#C9A227]/80 tracking-[0.35em] uppercase mt-1">
            The Land of the Sun
          </p>
          <WingedSun />
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequestOtp} className="space-y-3 mt-5">
            <div>
              <label className="block text-sm font-medium text-[#E6C55C] mb-1.5">Email or Phone</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={whiteInput}
                placeholder="your@email.com"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E6C55C] mb-2">Channel</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChannel("EMAIL")}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${
                    channel === "EMAIL"
                      ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]"
                      : "bg-white/5 text-[#d8c9a0]/70 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("SMS")}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${
                    channel === "SMS"
                      ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]"
                      : "bg-white/5 text-[#d8c9a0]/70 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  SMS
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className={goldBtn}>
              {loading && <Loader2 className="animate-spin" size={20} />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3 mt-5">
            <div className="bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-lg p-3 text-sm text-[#F0D78C]">
              {message}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E6C55C] mb-1.5">OTP Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={whiteInput + " text-center text-2xl tracking-[0.5em]"}
                placeholder="123456"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>
            <button type="submit" disabled={loading} className={goldBtn}>
              {loading && <Loader2 className="animate-spin" size={20} />}
              Verify & Sign In
            </button>
            <button
              type="button"
              onClick={() => { setStep("request"); setError(""); setMessage(""); }}
              className="w-full text-[#C9A227]/70 hover:text-[#E6C55C] text-sm transition"
            >
              ← Back
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 bg-red-900/40 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <p className="mt-6 text-center text-[10px] text-[#C9A227]/60 tracking-[0.3em] uppercase">
          Powered by Thoth
        </p>
      </div>
    </div>
  );
}