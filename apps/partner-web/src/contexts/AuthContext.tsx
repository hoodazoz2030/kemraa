"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { partnerAuthApi, setTokens, clearTokens } from "@/lib/api";
import Cookies from "js-cookie";

interface User {
  id: string;
  email: string;
  accountType: string;
  organization?: { id: string; displayName: string; legalName: string; status: string };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    partnerAuthApi.me()
      .then((res: any) => setUser(res.user ?? res))
      .catch(() => {
        clearTokens();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await partnerAuthApi.login(email, password);
    if (data.error) throw new Error(data.error.message || "Login failed");
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await partnerAuthApi.logout(); } catch {}
    clearTokens();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
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
