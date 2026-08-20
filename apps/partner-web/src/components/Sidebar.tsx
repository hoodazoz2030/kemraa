"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Map, Car, Truck, ScrollText, FileSignature,
  DollarSign, Receipt, BarChart3, Star, Bell, HelpCircle,
  Users, Settings, Building2, Webhook
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/services", label: "Services", icon: Map },
  { href: "/bookings", label: "Bookings", icon: ScrollText },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/vehicles", label: "Vehicles", icon: Truck },
  { href: "/rides", label: "Rides", icon: Car },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/settlements", label: "Settlements", icon: Receipt },
  { href: "/contracts", label: "Contracts", icon: FileSignature },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/support", label: "Support", icon: HelpCircle },
  { href: "/team", label: "Team", icon: Users },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-kemraa-dark border-r border-kemraa-goldDark/25 flex flex-col h-screen">
      <div className="p-5 border-b border-kemraa-goldDark/25 flex items-center gap-3 flex-shrink-0">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center shadow-[0_0_20px_rgba(201,162,39,0.35)]">
          <Building2 size={28} className="text-kemraa-dark" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-[0.15em] text-kemraa-gold">KEMRAA</h1>
          <p className="text-[10px] text-kemraa-goldDark/70 tracking-[0.25em] uppercase">Partner Portal</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
              <span className="flex-1 text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-kemraa-goldDark/25 text-center flex-shrink-0">
        <p className="text-[10px] text-kemraa-goldDark/60 tracking-[0.3em] uppercase">Powered by Thoth</p>
      </div>
    </aside>
  );
}
