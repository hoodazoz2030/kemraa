"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

type Lang = "en" | "ar";

const dict: Record<Lang, Record<string, string>> = {
  en: {
    partnerPortal: "Partner Portal",
    poweredBy: "Powered by Thoth",
    "nav.dashboard": "Dashboard",
    "nav.services": "Services",
    "nav.bookings": "Bookings",
    "nav.drivers": "Drivers",
    "nav.vehicles": "Vehicles",
    "nav.rides": "Rides",
    "nav.finance": "Finance",
    "nav.settlements": "Settlements",
    "nav.documents": "Documents",
    "nav.contracts": "Contracts",
    "nav.reports": "Reports",
    "nav.reviews": "Reviews",
    "nav.notifications": "Notifications",
    "nav.support": "Support",
    "nav.team": "Team",
    "nav.profile": "Company Profile",
    "nav.settings": "Settings",
    "nav.audit": "Activity Log",
    "login.email": "EMAIL",
    "login.password": "PASSWORD",
    "login.enter": "ENTER",
    "login.forgot": "Forgot password?",
    "dash.welcome": "Welcome back",
    "dash.subtitle": "Here's what's happening with your business",
    "dash.today": "Today",
    "dash.week": "This Week",
    "dash.month": "This Month",
    "dash.gross": "Gross Revenue",
    "dash.commission": "KEMRAA Commission",
    "dash.net": "Net Payout",
    "dash.bookings": "Bookings",
    "dash.status": "Booking Status",
    "dash.recent": "Recent Bookings",
    "dash.noBookings": "No bookings yet",
    "dash.new": "New",
    "dash.confirmed": "Confirmed",
    "dash.completed": "Completed",
    "dash.cancelled": "Cancelled",
    "header.logout": "Logout",
  },
  ar: {
    partnerPortal: "بوابة الشركاء",
    poweredBy: "مدعوم من تحوت",
    "nav.dashboard": "لوحة التحكم",
    "nav.services": "الخدمات",
    "nav.bookings": "الحجوزات",
    "nav.drivers": "السائقون",
    "nav.vehicles": "المركبات",
    "nav.rides": "الرحلات",
    "nav.finance": "المالية",
    "nav.settlements": "التسويات",
    "nav.documents": "المستندات",
    "nav.contracts": "العقود",
    "nav.reports": "التقارير",
    "nav.reviews": "التقييمات",
    "nav.notifications": "الإشعارات",
    "nav.support": "الدعم",
    "nav.team": "الفريق",
    "nav.profile": "ملف الشركة",
    "nav.settings": "الإعدادات",
    "nav.audit": "سجل النشاط",
    "login.email": "البريد الإلكتروني",
    "login.password": "كلمة المرور",
    "login.enter": "دخول",
    "login.forgot": "نسيت كلمة المرور؟",
    "dash.welcome": "مرحباً بعودتك",
    "dash.subtitle": "إليك ما يحدث في عملك",
    "dash.today": "اليوم",
    "dash.week": "هذا الأسبوع",
    "dash.month": "هذا الشهر",
    "dash.gross": "إجمالي الإيرادات",
    "dash.commission": "عمولة كمبرا",
    "dash.net": "صافي المستحقات",
    "dash.bookings": "الحجوزات",
    "dash.status": "حالة الحجوزات",
    "dash.recent": "أحدث الحجوزات",
    "dash.noBookings": "لا توجد حجوزات بعد",
    "dash.new": "جديدة",
    "dash.confirmed": "مؤكدة",
    "dash.completed": "مكتملة",
    "dash.cancelled": "ملغاة",
    "header.logout": "تسجيل الخروج",
  },
};

interface LangCtx {
  lang: Lang;
  t: (key: string) => string;
  toggle: () => void;
}

const LanguageContext = createContext<LangCtx | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("kemraa_lang");
    if (saved === "ar" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    localStorage.setItem("kemraa_lang", lang);
  }, [lang]);

  const t = useCallback((key: string) => dict[lang][key] ?? dict.en[key] ?? key, [lang]);
  const toggle = useCallback(() => setLang((l) => (l === "en" ? "ar" : "en")), []);

  return <LanguageContext.Provider value={{ lang, t, toggle }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}