"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kemraa-dark via-kemraa-darkAlt to-kemraa-dark p-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold mb-4 shadow-[0_0_30px_rgba(201,162,39,0.4)]">
              <Building2 size={36} className="text-kemraa-dark" />
            </div>
            <h1 className="text-3xl font-bold tracking-[0.15em] text-kemraa-gold">KEMRAA</h1>
            <p className="text-sm text-kemraa-text/70 tracking-wider mt-1">{t("partnerPortal")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">{t("login.email")}</label>
              <div className="relative">
                <Mail size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-kemraa-goldDark" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="partner@company.com"
                  className="w-full ps-12 pe-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold focus:ring-2 focus:ring-kemraa-goldDark/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">{t("login.password")}</label>
              <div className="relative">
                <Lock size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-kemraa-goldDark" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full ps-12 pe-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-text placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold focus:ring-2 focus:ring-kemraa-goldDark/20"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email.trim() || !password}
              className="w-full py-3 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 transition tracking-wider"
            >
              {busy ? <Loader2 className="animate-spin" size={20} /> : t("login.enter")}
            </button>
          </form>

          <div className="text-center mt-4">
            <Link href="/forgot-password" className="text-xs text-kemraa-goldDark hover:text-kemraa-gold transition">
              {t("login.forgot")}
            </Link>
          </div>

          <p className="text-center text-[10px] text-kemraa-goldDark/60 tracking-[0.35em] mt-6">
            {t("poweredBy").toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}