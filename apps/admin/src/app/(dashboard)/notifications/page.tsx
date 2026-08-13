"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useState, FormEvent } from "react";
import { Send } from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState("EMAIL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications", { params: { limit: 100 } }).then((r) => r.data),
  });

  const sendMutation = useMutation({
    mutationFn: (b: any) => api.post("/notifications", b),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setTitle(""); setBody("");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMutation.mutate({ recipientId: user?.id, channel, title, body });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
          <option>EMAIL</option><option>SMS</option><option>PUSH</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="border border-gray-300 rounded-lg px-3 py-2" />
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" required className="border border-gray-300 rounded-lg px-3 py-2" />
        <button type="submit" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          <Send size={16} /> Send
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Channel</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Title</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Body</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No notifications</td></tr>
            )}
            {(data?.items ?? []).map((n: any) => (
              <tr key={n.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{n.channel}</td>
                <td className="px-4 py-3 text-gray-700">{n.title}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{n.body}</td>
                <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}