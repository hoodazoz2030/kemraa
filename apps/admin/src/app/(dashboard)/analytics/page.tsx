"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function AnalyticsPage() {
  const { data: trips = [] } = useQuery({
    queryKey: ["trips-analytics"],
    queryFn: () => api.get("/trips", { params: { limit: 500 } }).then((r) => r.data),
  });
  const { data: services } = useQuery({
    queryKey: ["services-analytics"],
    queryFn: () => api.get("/services", { params: { limit: 500 } }).then((r) => r.data),
  });
  const { data: bookings } = useQuery({
    queryKey: ["bookings-analytics"],
    queryFn: () => api.get("/bookings", { params: { limit: 500 } }).then((r) => r.data),
  });

  // Aggregate trips by status
  const tripsByStatus = Object.entries(
    (trips as any[]).reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Aggregate services by type
  const servicesByType = Object.entries(
    (services?.items ?? []).reduce<Record<string, number>>((acc, s: any) => {
      acc[s.type] = (acc[s.type] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Aggregate bookings by status
  const bookingsByStatus = Object.entries(
    (bookings?.items ?? []).reduce<Record<string, number>>((acc, b: any) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trips by status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Trips by Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={tripsByStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(e) => `${e.name}: ${e.value}`}
              >
                {tripsByStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings by status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bookings by Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bookingsByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Services by Type</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={servicesByType}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}