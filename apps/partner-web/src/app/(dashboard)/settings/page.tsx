"use client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Shield, Bell, Globe } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Settings</h1>
        <p className="text-sm text-kemraa-text/60 mt-1">Manage your account and preferences</p>
      </div>

      <Section icon={Building2} title="Company Information">
        <Row k="Company" v={user?.organization?.displayName ?? "—"} />
        <Row k="Legal Name" v={user?.organization?.legalName ?? "—"} />
        <Row k="Company ID" v={user?.organization?.id ?? "—"} mono />
        <Row k="Status" v={user?.organization?.status ?? "—"} />
      </Section>

      <Section icon={Shield} title="Security">
        <div className="p-4 bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm text-kemraa-text font-medium">Two-Factor Authentication</div>
            <div className="text-xs text-kemraa-text/50">Add an extra layer of security</div>
          </div>
          <span className="text-xs text-kemraa-text/50 px-2 py-1 rounded bg-white/5">Coming soon</span>
        </div>
        <div className="p-4 bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm text-kemraa-text font-medium">Trusted Devices</div>
            <div className="text-xs text-kemraa-text/50">Manage devices that can access your account</div>
          </div>
          <span className="text-xs text-kemraa-text/50 px-2 py-1 rounded bg-white/5">Coming soon</span>
        </div>
      </Section>

      <Section icon={Bell} title="Notifications">
        <Toggle label="Email notifications for new bookings" />
        <Toggle label="Email notifications for settlement payouts" />
        <Toggle label="Email notifications for support replies" />
      </Section>

      <Section icon={Globe} title="Preferences">
        <div className="p-4 bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm text-kemraa-text font-medium">Language</div>
            <div className="text-xs text-kemraa-text/50">Choose your preferred language</div>
          </div>
          <select className="px-3 py-1.5 bg-white/5 border border-kemraa-goldDark/40 rounded-lg text-sm text-kemraa-text focus:outline-none focus:border-kemraa-gold">
            <option className="bg-kemraa-dark">English</option>
            <option className="bg-kemraa-dark">العربية</option>
          </select>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon size={18} className="text-kemraa-gold" />
        <h2 className="text-lg font-semibold text-kemraa-gold tracking-wider">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ k, v, mono }: any) {
  return (
    <div className="flex justify-between py-2 border-b border-kemraa-goldDark/10 last:border-0">
      <span className="text-sm text-kemraa-text/60">{k}</span>
      <span className={`text-sm text-kemraa-text ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function Toggle({ label }: any) {
  return (
    <div className="p-4 bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-lg flex items-center justify-between">
      <div className="text-sm text-kemraa-text">{label}</div>
      <div className="w-10 h-6 rounded-full bg-kemraa-goldDark/30 relative cursor-pointer">
        <div className="w-5 h-5 rounded-full bg-kemraa-gold absolute top-0.5 left-0.5" />
      </div>
    </div>
  );
}