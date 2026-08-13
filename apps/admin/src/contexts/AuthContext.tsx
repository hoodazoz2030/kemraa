"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, api } from "@/lib/api";
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
    if (token) {
      authApi.me()
        .then((res: any) => setUser(res.data))
        .catch(() => {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, channel: "EMAIL" | "SMS", code: string) => {
    const { data } = await authApi.verifyOtp(identifier, channel, code);
    Cookies.set("access_token", data.accessToken, { expires: 1 });
    Cookies.set("refresh_token", data.refreshToken, { expires: 30 });
    setUser(data.user);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    setUser(null);
  };

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