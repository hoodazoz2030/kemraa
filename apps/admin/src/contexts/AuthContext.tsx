"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "@/lib/api";
import Cookies from "js-cookie";

interface User {
  id: string;
  email: string;
  phone?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, channel: "EMAIL" | "SMS", code: string) => Promise<void>;
  logout: () => Promise<void>;
  debug: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("access_token");
    console.log("[AUTH] init - token?", !!token, "length:", token?.length);
    if (!token) {
      setLoading(false);
      return;
    }
    // Wait 200ms to let cookies settle before calling /me
    const timer = setTimeout(() => {
      authApi.me()
        .then((res: any) => {
          console.log("[AUTH] /me OK:", res.data);
          setUser(res.data);
        })
        .catch((err) => {
          console.warn("[AUTH] /me failed (clearing cookies):", err?.response?.status);
          Cookies.remove("access_token", { path: "/" });
          Cookies.remove("refresh_token", { path: "/" });
          setUser(null);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const login = async (identifier: string, channel: "EMAIL" | "SMS", code: string) => {
    console.log("[AUTH] login start");
    const { data } = await authApi.verifyOtp(identifier, channel, code);
    console.log("[AUTH] verifyOtp response keys:", Object.keys(data));
    console.log("[AUTH] accessToken:", data.accessToken?.substring(0, 30) + "...");
    console.log("[AUTH] user in response:", data.user);

    // Save cookies WITHOUT sameSite (localhost issue)
    Cookies.set("access_token", data.accessToken, { path: "/", expires: 1 });
    Cookies.set("refresh_token", data.refreshToken, { path: "/", expires: 30 });

    // Verify cookies actually saved
    const savedToken = Cookies.get("access_token");
    console.log("[AUTH] cookie saved?", !!savedToken, "length:", savedToken?.length);

    // Set user from response OR fetch from /me
    if (data.user && data.user.id) {
      console.log("[AUTH] using user from response");
      setUser(data.user);
    } else {
      console.log("[AUTH] user missing from response, fetching /me");
      const meRes = await authApi.me();
      setUser(meRes.data);
    }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    Cookies.remove("access_token", { path: "/" });
    Cookies.remove("refresh_token", { path: "/" });
    setUser(null);
  };

  const debug = () => {
    console.log("[DEBUG] cookies:", {
      access_token: Cookies.get("access_token")?.substring(0, 30) + "...",
      refresh_token: !!Cookies.get("refresh_token"),
    });
    console.log("[DEBUG] user state:", user);
    console.log("[DEBUG] all cookies:", Cookies.get());
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, debug }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};