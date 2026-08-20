"use client";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Bell, User } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-kemraa-dark border-b border-kemraa-goldDark/25 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <User size={18} className="text-kemraa-gold" />
        <div>
          <div className="text-sm text-kemraa-text font-medium">{user?.email}</div>
          <div className="text-[10px] text-kemraa-goldDark/70 tracking-wider uppercase">
            {user?.organization?.displayName || user?.accountType}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-white/5 text-kemraa-text hover:text-kemraa-gold transition">
          <Bell size={18} />
        </button>
        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-red-500/10 text-kemraa-text hover:text-red-400 transition"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
