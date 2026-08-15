"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, ShoppingBag, Calendar, Bell, HelpCircle, Users, BarChart3, ScrollText, Flag, CreditCard } from "lucide-react";
import clsx from "clsx";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/trips", label: "Trips", icon: Map },
  { href: "/services", label: "Services", icon: ShoppingBag },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/support", label: "Support", icon: HelpCircle },
  { href: "/users", label: "Users", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/payments", label: "Payments", icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-72 bg-[#0C0A06] border-r border-[#C9A227]/25 flex flex-col min-h-screen">
      <div className="p-5 border-b border-[#C9A227]/25 flex items-center gap-3">
        <Image
          src="/logo-dark.png"
          alt="Kemraa"
          width={56}
          height={56}
          className="rounded-full ring-1 ring-[#C9A227]/50 shadow-[0_0_20px_rgba(201,162,39,0.35)]"
        />
        <div>
          <h1 className="text-xl font-bold tracking-[0.15em] text-[#E6C55C]">KEMRAA</h1>
          <p className="text-[10px] text-[#C9A227]/70 tracking-[0.25em] uppercase">The Land of the Sun</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition",
                isActive
                  ? "bg-gradient-to-r from-[#C9A227] to-[#E6C55C] text-[#0C0A06] font-semibold shadow-[0_0_15px_rgba(201,162,39,0.4)]"
                  : "text-[#d8c9a0]/75 hover:bg-white/5 hover:text-[#E6C55C]"
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#C9A227]/25 text-center">
        <p className="text-[10px] text-[#C9A227]/60 tracking-[0.3em] uppercase">Powered by Thoth</p>
      </div>
    </aside>
  );
}