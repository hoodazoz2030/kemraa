"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Map, ShoppingBag, Calendar, HelpCircle } from "lucide-react";

export default function DashboardPage() {
  const { data: trips = [] } = useQuery({
    queryKey: ["trips-all"],
    queryFn: () => api.get("/trips", { params: { limit: 200 } }).then((r) => r.data),
  });
  const { data: services } = useQuery({
    queryKey: ["services-count"],
    queryFn: () => api.get("/services", { params: { limit: 1 } }).then((r) => r.data),
  });
  const { data: bookings } = useQuery({
    queryKey: ["bookings-count"],
    queryFn: () => api.get("/bookings", { params: { limit: 1 } }).then((r) => r.data),
  });
  const { data: tickets } = useQuery({
    queryKey: ["tickets-count"],
    queryFn: () => api.get("/support/tickets", { params: { limit: 1 } }).then((r) => r.data),
  });

  const activeTrips = (trips as any[]).filter((t) => t.status === "ACTIVE").length;

  const stats = [
    { label: "Active Trips", value: activeTrips, icon: Map, color: "bg-blue-100 text-blue-600" },
    { label: "Services", value: services?.total ?? 0, icon: ShoppingBag, color: "bg-green-100 text-green-600" },
    { label: "Bookings", value: bookings?.total ?? 0, icon: Calendar, color: "bg-purple-100 text-purple-600" },
    { label: "Support Tickets", value: tickets?.total ?? 0, icon: HelpCircle, color: "bg-red-100 text-red-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}