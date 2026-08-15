"use client";
import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

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

  const inputClass =
    "w-full px-4 py-3 rounded-lg bg-[#141008] border border-[#C9A227]/30 text-[#F5E9C9] placeholder-[#C9A227]/40 focus:outline-none focus:border-[#E6C55C] focus:ring-1 focus:ring-[#E6C55C]/50 transition";

  const goldBtn =
    "w-full py-3 rounded-lg font-semibold text-[#0C0A06] bg-gradient-to-r from-[#C9A227] via-[#E6C55C] to-[#C9A227] hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(201,162,39,0.35)] transition";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0A06] p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#C9A227]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] rounded-full bg-[#0E7C86]/10 blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full bg-black/50 backdrop-blur rounded-2xl border border-[#C9A227]/30 p-8 shadow-[0_0_60px_rgba(201,162,39,0.15)] relative">
        <div className="text-center mb-8">
          <Image
            src="/logo-dark.png"
            alt="Kemraa — The Land of the Sun"
            width={140}
            height={140}
            className="mx-auto rounded-full ring-2 ring-[#C9A227]/50 shadow-[0_0_40px_rgba(201,162,39,0.45)]"
          />
          <h1 className="mt-4 text-3xl font-bold tracking-[0.2em] bg-gradient-to-b from-[#F0D78C] to-[#B8860B] bg-clip-text text-transparent">
            KEMRAA
          </h1>
          <p className="text-[11px] text-[#C9A227]/70 tracking-[0.35em] uppercase mt-1">
            The Land of the Sun
          </p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#E6C55C] mb-1">Email or Phone</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={inputClass}
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
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    channel === "EMAIL"
                      ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]"
                      : "bg-white/5 text-[#d8c9a0]/70 hover:bg-white/10"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("SMS")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    channel === "SMS"
                      ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06]"
                      : "bg-white/5 text-[#d8c9a0]/70 hover:bg-white/10"
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
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-lg p-3 text-sm text-[#F0D78C]">
              {message}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E6C55C] mb-1">OTP Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass + " text-center text-2xl tracking-[0.5em]"}
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
          <div className="mt-4 bg-red-900/30 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <p className="mt-6 text-center text-[10px] text-[#C9A227]/50 tracking-[0.3em] uppercase">
          Powered by Thoth
        </p>
      </div>
    </div>
  );
}