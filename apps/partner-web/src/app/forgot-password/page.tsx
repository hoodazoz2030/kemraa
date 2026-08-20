"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devToken, setDevToken] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/partner-security/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
      if (res.data?.devResetToken) setDevToken(res.data.devResetToken);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kemraa-dark via-kemraa-darkAlt to-kemraa-dark p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-2xl p-8">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-kemraa-text/60 hover:text-kemraa-gold mb-6">
          <ArrowLeft size={14} /> Back to login
        </Link>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold mb-3">
            <Mail size={28} className="text-kemraa-dark" />
          </div>
          <h1 className="text-2xl font-bold text-kemraa-gold">Forgot Password?</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        {!sent ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">EMAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="partner@company.com" className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold" />
            </div>
            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={busy || !email.trim()} className="w-full py-3 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-green-300 font-semibold">Reset link sent</div>
                <div className="text-xs text-kemraa-text/70 mt-1">Check your email for a link to reset your password. The link expires in 1 hour.</div>
              </div>
            </div>
            {devToken && (
              <div className="p-4 bg-kemraa-dark border border-kemraa-goldDark/30 rounded-lg">
                <div className="text-xs text-kemraa-gold mb-2 tracking-wider">DEV MODE — Reset Token</div>
                <code className="block text-[10px] text-kemraa-text/70 break-all mb-3">{devToken}</code>
                <Link href={`/reset-password?token=${devToken}`} className="block text-center py-2 rounded bg-kemraa-goldDark/20 text-kemraa-gold text-sm hover:bg-kemraa-goldDark/30">
                  Open Reset Page →
                </Link>
              </div>
            )}
            <Link href="/login" className="block text-center text-sm text-kemraa-text/60 hover:text-kemraa-gold">Back to login</Link>
          </div>
        )}
      </div>
    </div>
  );
}