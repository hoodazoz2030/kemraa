"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirectAttempts = useRef(0);

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/login" && redirectAttempts.current < 3) {
      redirectAttempts.current++;
      console.log(`[PROTECTED] redirecting to login (attempt ${redirectAttempts.current})`);
      // Don't redirect immediately — give it a chance to load
      setTimeout(() => {
        if (!user) router.push("/login");
      }, 500);
    }
    if (user) redirectAttempts.current = 0;
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-gray-400 mx-auto" size={32} />
          <p className="mt-4 text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}