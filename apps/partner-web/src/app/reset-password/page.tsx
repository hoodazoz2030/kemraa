"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Lock, Loader2, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setError("Passwords do not match"); return; }
    if (pw.length < 8) { setError("Password must be at least 8 characters"); return; }
    setBusy(true);
    setError("");
    try {
      await api.post("/partner-security/reset-password", { token, newPassword: pw });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Reset failed. Link may be expired.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kemraa-dark via-kemraa-darkAlt to-kemraa-dark p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold mb-3">
            <Lock size={28} className="text-kemraa-dark" />
          </div>
          <h1 className="text-2xl font-bold text-kemraa-gold">Set New Password</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <CheckCircle size={24} className="text-green-400" />
            <div>
              <div className="text-sm text-green-300 font-semibold">Password updated!</div>
              <div className="text-xs text-kemraa-text/70 mt-1">Redirecting to login...</div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {!token && <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-300">Missing reset token. Please request a new one.</div>}
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">NEW PASSWORD</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus minLength={8} placeholder="••••••••" className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
            </div>
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">CONFIRM PASSWORD</label>
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} placeholder="••••••••" className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
            </div>
            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={busy || !token || !pw} className="w-full py-3 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}