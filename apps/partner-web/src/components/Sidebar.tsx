"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Map, Car, Truck, ScrollText, FileSignature,
  DollarSign, Receipt, BarChart3, Star, Bell, HelpCircle,
  Users, Settings, Building2, FileText, History
} from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_ITEMS = [
  { href: "/", key: "nav.dashboard", icon: Home },
  { href: "/services", key: "nav.services", icon: Map },
  { href: "/bookings", key: "nav.bookings", icon: ScrollText },
  { href: "/drivers", key: "nav.drivers", icon: Users },
  { href: "/vehicles", key: "nav.vehicles", icon: Truck },
  { href: "/rides", key: "nav.rides", icon: Car },
  { href: "/finance", key: "nav.finance", icon: DollarSign },
  { href: "/settlements", key: "nav.settlements", icon: Receipt },
  { href: "/documents", key: "nav.documents", icon: FileText },
  { href: "/contracts", key: "nav.contracts", icon: FileSignature },
  { href: "/reports", key: "nav.reports", icon: BarChart3 },
  { href: "/reviews", key: "nav.reviews", icon: Star },
  { href: "/notifications", key: "nav.notifications", icon: Bell },
  { href: "/support", key: "nav.support", icon: HelpCircle },
  { href: "/team", key: "nav.team", icon: Users },
  { href: "/profile", key: "nav.profile", icon: Building2 },
  { href: "/settings", key: "nav.settings", icon: Settings },
  { href: "/audit", key: "nav.audit", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="w-72 bg-kemraa-dark border-e border-kemraa-goldDark/25 flex flex-col h-screen">
      <div className="p-5 border-b border-kemraa-goldDark/25 flex items-center gap-3 flex-shrink-0">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center shadow-[0_0_20px_rgba(201,162,39,0.35)]">
          <Building2 size={28} className="text-kemraa-dark" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-[0.15em] text-kemraa-gold">KEMRAA</h1>
          <p className="text-[10px] text-kemraa-goldDark/70 tracking-[0.25em] uppercase">{t("partnerPortal")}</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition relative",
                isActive
                  ? "bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark font-semibold shadow-[0_0_15px_rgba(201,162,39,0.4)]"
                  : "text-kemraa-text/75 hover:bg-white/5 hover:text-kemraa-gold"
              )}
            >
              <Icon size={18} />
              <span className="flex-1 text-sm">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-kemraa-goldDark/25 text-center flex-shrink-0">
        <p className="text-[10px] text-kemraa-goldDark/60 tracking-[0.3em] uppercase">{t("poweredBy")}</p>
      </div>
    </aside>
  );
}