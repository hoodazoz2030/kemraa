"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogOut, Bell, User, Globe } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { lang, toggle, t } = useLanguage();

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
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5 text-kemraa-text hover:text-kemraa-gold transition text-xs font-semibold"
          title={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}
        >
          <Globe size={16} />
          {lang === "en" ? "عربي" : "EN"}
        </button>
        <button className="p-2 rounded-lg hover:bg-white/5 text-kemraa-text hover:text-kemraa-gold transition">
          <Bell size={18} />
        </button>
        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-red-500/10 text-kemraa-text hover:text-red-400 transition"
          title={t("header.logout")}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}