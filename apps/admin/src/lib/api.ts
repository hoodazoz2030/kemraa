import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach token
api.interceptors.request.use((config: any) => {
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 + refresh
api.interceptors.response.use(
  (res: any) => res,
  async (error: any) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          Cookies.set("access_token", data.accessToken, { expires: 1 });
          Cookies.set("refresh_token", data.refreshToken, { expires: 30 });
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  requestOtp: (identifier: string, channel: "EMAIL" | "SMS") =>
    api.post("/auth/otp/request", { identifier, channel }),
  verifyOtp: (identifier: string, channel: string, code: string) =>
    api.post("/auth/otp/verify", { identifier, channel, code }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/users/me"),
};
// ============ Audit Logs ============
export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, any>;
  ip: string | null;
  createdAt: string;
}

export interface ListAuditLogsResponse {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAuditLogs(params: {
  action?: string;
  resourceType?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ListAuditLogsResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  });
  const res = await api.get("/admin/audit-logs?" + qs.toString());
  return res.data;
}
// ============ Feature Flags ============
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  updatedAt: string;
}

export const featureFlagsApi = {
  list: () => api.get("/feature-flags").then((r) => r.data),
  get: (key: string) => api.get("/feature-flags/" + key).then((r) => r.data),
  set: (key: string, enabled: boolean) => api.put("/feature-flags/" + key, { enabled }).then((r) => r.data),
};
// ============ Search ============
export interface SearchHit {
  document: any;
  text_match: number;
}
export interface SearchCollectionResult {
  collection: string;
  found: number;
  hits: SearchHit[];
}
export interface SearchResponse {
  results: SearchCollectionResult[];
}
export const searchApi = {
  query: (q: string) => api.get("/search", { params: { q } }).then((r) => r.data as SearchResponse),
  reindex: () => api.post("/search/reindex").then((r) => r.data),
};
// ============ Payments ============
export interface Payment {
  id: string;
  bookingId: string | null;
  tripId: string | null;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  amountMinor: number;
  currency: string;
  methodType: string;
  createdAt: string;
  booking?: {
    id: string;
    status: string;
    traveler?: { email: string };
    service?: { name: string; type: string };
  };
}

export const paymentsApi = {
  adminList: () => api.get("/payments/admin").then((r) => r.data as Payment[]),
};
// ============ Analytics ============
export interface AnalyticsOverview {
  totals: {
    revenue: number;
    bookings: number;
    users: number;
    tickets: number;
  };
  revenueByDay: { date: string; total: number }[];
  paymentsByProvider: { provider: string; count: number; total: number }[];
  bookingsByStatus: { status: string; count: number }[];
  topServices: { name: string; count: number; revenue: number }[];
}

export const analyticsApi = {
  overview: (days = 14) =>
    api.get(`/analytics/overview?days=${days}`).then((r) => r.data as AnalyticsOverview),
};
// ============ Notifications ============
export interface Notification {
  id: string;
  userId: string;
  channel: string;
  type: string;
  title: string;
  body: string;
  status: string;
  sentAt: string | null;
  readAt: string | null;
}

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.unreadOnly) q.set("unreadOnly", "true");
    if (params?.type) q.set("type", params.type);
    const qs = q.toString();
    return api.get(`/notifications${qs ? `?${qs}` : ""}`).then((r) => r.data as { items: Notification[]; total: number });
  },
  unreadCount: () => api.get("/notifications/unread-count").then((r) => r.data as { count: number }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post("/notifications/read-all").then((r) => r.data),
  adminList: (params?: { type?: string; userId?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.userId) q.set("userId", params.userId);
    const qs = q.toString();
    return api.get(`/notifications/admin${qs ? `?${qs}` : ""}`).then((r) => r.data as Notification[]);
  },
};
// ============ Support ============
export interface SupportReply {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  author: { email: string; profile: { firstName: string | null; lastName: string | null } | null };
}

export interface SupportTicket {
  id: string;
  userId: string;
  tripId?: string | null;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string | null;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  user: { email: string; profile: { firstName: string | null; lastName: string | null } | null };
  replies?: SupportReply[];
  _count?: { replies: number };
}

export const supportApi = {
  adminList: (params?: { status?: string; priority?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.priority) q.set("priority", params.priority);
    const qs = q.toString();
    return api.get(`/support/admin${qs ? `?${qs}` : ""}`).then((r) => r.data as SupportTicket[]);
  },
  adminDetail: (id: string) => api.get(`/support/admin/${id}`).then((r) => r.data as SupportTicket),
  adminReply: (id: string, body: string) => api.post(`/support/admin/${id}/reply`, { body }).then((r) => r.data),
  adminUpdate: (id: string, update: { status?: string; priority?: string; assignedTo?: string | null }) =>
    api.patch(`/support/admin/${id}`, update).then((r) => r.data),
};