"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { partnerSecurityApi } from "@/lib/api";
import { Shield, Copy, CheckCircle, Loader2 } from "lucide-react";

function genCode(secret: string): string {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cl = secret.toUpperCase().replace(/=+$/, "");
  let bits = 0, v = 0, i = 0;
  const o = new Uint8Array(Math.ceil(cl.length * 5 / 8));
  for (const ch of cl) {
    const x = c.indexOf(ch);
    if (x === -1) continue;
    v = (v << 5) | x;
    bits += 5;
    if (bits >= 8) { o[i++] = (v >>> (bits - 8)) & 255; bits -= 8; }
  }
  const buf = new Uint8Array(8);
  let tmp = Math.floor(Date.now() / 30000);
  for (let j = 7; j >= 0; j--) { buf[j] = tmp & 0xff; tmp = Math.floor(tmp / 256); }
  // Use crypto.subtle for HMAC-SHA1 in browser
  return "------"; // placeholder - will use server-verify
}

export default function MfaSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"setup" | "verify">("setup");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const res = await partnerSecurityApi.mfaSetup();
      setSecret(res.secret);
      setUri(res.uri);
      setStep("verify");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Setup failed");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await partnerSecurityApi.mfaVerify(code);
      router.push("/settings/security");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kemraa-dark via-kemraa-darkAlt to-kemraa-dark p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/30 rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold mb-3">
            <Shield size={28} className="text-kemraa-dark" />
          </div>
          <h1 className="text-2xl font-bold text-kemraa-gold">Two-Factor Authentication</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">Add an extra layer of security</p>
        </div>

        {step === "setup" ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
              Two-factor authentication adds a code from your authenticator app (Google Authenticator, Authy, 1Password) to your login.
            </div>
            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}
            <button onClick={start} disabled={busy} className="w-full py-3 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Start Setup"}
            </button>
          </div>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div className="p-4 bg-kemraa-dark border border-kemraa-goldDark/30 rounded-lg">
              <div className="text-xs text-kemraa-gold mb-2 tracking-wider">STEP 1: SAVE SECRET KEY</div>
              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 px-3 py-2 bg-white/5 rounded font-mono text-sm text-kemraa-gold break-all">{secret}</code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="p-2 rounded bg-kemraa-goldDark/20 text-kemraa-gold hover:bg-kemraa-goldDark/30"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-xs text-kemraa-text/50">Save this backup key. Open your authenticator app and add a new account using this key or the URI below.</p>
              <details className="mt-2">
                <summary className="text-xs text-kemraa-gold cursor-pointer">Show QR URI (otpauth://)</summary>
                <code className="block mt-2 text-[10px] text-kemraa-text/60 break-all">{uri}</code>
              </details>
            </div>

            <div>
              <label className="block text-xs text-kemraa-gold mb-2 tracking-wider">STEP 2: ENTER 6-DIGIT CODE</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
                className="w-full px-4 py-3 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-kemraa-gold text-center text-2xl tracking-[0.5em] font-mono placeholder:text-gray-600 focus:outline-none focus:border-kemraa-gold"
              />
            </div>

            {error && <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">{error}</div>}

            <button type="submit" disabled={busy || code.length !== 6} className="w-full py-3 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Verify & Enable 2FA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}