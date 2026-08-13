"use client";
import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Mail, Smartphone, Loader2, Bug } from "lucide-react";
import Cookies from "js-cookie";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("customer.ar@kemraa.local");
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [diag, setDiag] = useState<string[]>([]);

  useEffect(() => {
    if (user && !loading) {
      console.log("[LOGIN] user detected, pushing to /");
      router.push("/");
    }
  }, [user, loading, router]);

  const log = (msg: string) => {
    console.log(msg);
    setDiag((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      log("Requesting OTP...");
      await authApi.requestOtp(identifier, channel);
      log("OTP requested OK");
      setMessage("OTP sent! Check docker logs for the code.");
      setStep("verify");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? err.message ?? "Failed";
      log("Request failed: " + msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      log("Verifying OTP...");
      await login(identifier, channel, code);
      log("login() returned. Checking cookies...");
      const token = Cookies.get("access_token");
      log(`Cookie present: ${!!token}, length: ${token?.length ?? 0}`);
      setMessage("Login successful! Redirecting...");
      // Give useEffect time to trigger
      setTimeout(() => {
        if (!user) {
          log("WARNING: user still null after 1s, forcing reload");
          window.location.href = "/";
        }
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? err.message ?? "Invalid OTP";
      log("Verify failed: " + msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kemraa Admin</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChannel("EMAIL")}
                className={`flex-1 py-2 rounded-lg font-medium ${channel === "EMAIL" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setChannel("SMS")}
                className={`flex-1 py-2 rounded-lg font-medium ${channel === "SMS" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                SMS
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              {message}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code (from docker logs)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest"
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              Verify & Sign In
            </button>
            <button
              type="button"
              onClick={() => { setStep("request"); setError(""); setMessage(""); setDiag([]); }}
              className="w-full text-gray-600 hover:text-gray-900 text-sm"
            >
              ← Back
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Diagnostic panel */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg border text-xs font-mono max-h-40 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Bug size={12} /> <span className="font-semibold">Debug</span>
          </div>
          {diag.length === 0 ? (
            <div className="text-gray-400">Events will appear here...</div>
          ) : (
            diag.map((d, i) => <div key={i} className="text-gray-700">{d}</div>)
          )}
        </div>
      </div>
    </div>
  );
}