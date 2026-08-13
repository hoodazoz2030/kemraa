"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("access_token");
    console.log("[AUTH] init - token present?", !!token);
    
    if (!token) {
      setLoading(false);
      return;
    }

    // Try to load user from /me
    authApi.me()
      .then((res: any) => {
        console.log("[AUTH] /me OK", res.data.email);
        setUser(res.data);
      })
      .catch((err) => {
        console.warn("[AUTH] /me failed:", err?.response?.status);
        Cookies.remove("access_token", { path: "/" });
        Cookies.remove("refresh_token", { path: "/" });
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, channel: "EMAIL" | "SMS", code: string) => {
    const { data } = await authApi.verifyOtp(identifier, channel, code);
    
    // Save cookies FIRST
    Cookies.set("access_token", data.accessToken, { path: "/", expires: 1 });
    Cookies.set("refresh_token", data.refreshToken, { path: "/", expires: 30 });
    
    // Get user from response OR fetch fresh
    let u = data.user;
    if (!u || !u.id) {
      const meRes = await authApi.me();
      u = meRes.data;
    }
    
    console.log("[AUTH] login OK, user:", u.email);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    Cookies.remove("access_token", { path: "/" });
    Cookies.remove("refresh_token", { path: "/" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};