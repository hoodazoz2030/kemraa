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
// ============ Services ============
export interface Service {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  currency: string;
  priceMinor: number;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const servicesApi = {
  list: (params?: { type?: string; status?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    q.set("limit", String(params?.limit ?? 200));
    return api.get(`/services?${q.toString()}`).then((r) => r.data as { items: Service[]; total: number });
  },
  get: (id: string) => api.get(`/services/${id}`).then((r) => r.data as Service),
  create: (data: Partial<Service>) => api.post("/services", data).then((r) => r.data as Service),
  update: (id: string, data: Partial<Service>) => api.patch(`/services/${id}`, data).then((r) => r.data as Service),
  activate: (id: string) => api.post(`/services/${id}/status`, { status: "ACTIVE" }).then((r) => r.data),
  deactivate: (id: string) => api.post(`/services/${id}/status`, { status: "INACTIVE" }).then((r) => r.data),
  delete: (id: string) => api.delete(`/services/${id}`).then((r) => r.data),
};
// ============ Trips ============
export interface ItineraryItem {
  id: string;
  type: string;
  title: string;
  startAt?: string;
  endAt?: string;
  location?: Record<string, unknown>;
  estimatedMinor?: number;
}

export interface Itinerary {
  id: string;
  version: number;
  items: ItineraryItem[];
  createdAt: string;
}

export interface Trip {
  id: string;
  travelerId: string;
  title: string;
  destinationCountry: string;
  startAt?: string;
  endAt?: string;
  currency: string;
  budgetMinor: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  traveler?: { email: string; profile?: { firstName: string | null; lastName: string | null } | null };
  itineraries?: Itinerary[];
}

export const tripsApi = {
  list: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    q.set("limit", String(params?.limit ?? 200));
    return api.get(`/trips?${q.toString()}`).then((r) => r.data as Trip[]);
  },
  get: (id: string) => api.get(`/trips/${id}`).then((r) => r.data as Trip),
  create: (data: Partial<Trip>) => api.post("/trips", data).then((r) => r.data as Trip),
  update: (id: string, data: Partial<Trip>) => api.patch(`/trips/${id}`, data).then((r) => r.data as Trip),
  approve: (id: string) => api.post(`/trips/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string) => api.post(`/trips/${id}/reject`, { reason }).then((r) => r.data),
  requestReview: (id: string) => api.post(`/trips/${id}/request`).then((r) => r.data),
};
// ============ Users ============
export interface UserSummary {
  id: string;
  email: string | null;
  phone: string | null;
  status: string;
  mfaEnabled: boolean;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  roles: string[];
  organization: string | null;
  tripsCount: number;
  bookingsCount: number;
  ticketsCount: number;
}

export interface UserDetail extends UserSummary {
  profile: any;
  trips: any[];
  bookings: any[];
  tickets: any[];
  notifications: any[];
  _count: { trips: number; bookings: number; tickets: number; notifications: number };
}

export const usersApi = {
  list: (params?: { search?: string; status?: string; role?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.role) q.set("role", params.role);
    q.set("limit", String(params?.limit ?? 200));
    return api.get(`/users?${q.toString()}`).then((r) => r.data as { items: UserSummary[]; total: number });
  },
  getDetail: (id: string) => api.get(`/users/${id}`).then((r) => r.data as UserDetail),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/users/${id}/status`, { status, reason }).then((r) => r.data),
  setRoles: (id: string, roles: string[]) => api.patch(`/users/${id}/roles`, { roles }).then((r) => r.data),
};
// ============ Locations ============
export interface LiveLocation {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: string | null;
  battery: number | null;
  updatedAt: string;
  displayName: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    status: string;
    profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
  };
}

export const locationsApi = {
  list: (activeMinutes = 60) =>
    api.get(`/locations/admin?activeMinutes=${activeMinutes}`).then((r) => r.data as LiveLocation[]),
  getOne: (userId: string) => api.get(`/locations/admin/${userId}`).then((r) => r.data as LiveLocation | null),
};
// ============ Bookings ============
export interface BookingItem {
  id: string;
  description: string;
  quantity: number;
  unitMinor: number;
  taxMinor: number;
  feeMinor: number;
}

export interface Booking {
  id: string;
  tripId?: string | null;
  travelerId: string;
  serviceId: string;
  providerId: string;
  status: string;
  externalRef?: string | null;
  totalMinor: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  service?: { title: string; type: string };
  traveler?: { email: string; profile?: { firstName: string | null; lastName: string | null } | null };
  items?: BookingItem[];
  payments?: any[];
}

export const bookingsApi = {
  list: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    q.set("limit", String(params?.limit ?? 200));
    return api.get(`/bookings?${q.toString()}`).then((r) => r.data as { items: Booking[]; total: number } | Booking[]);
  },
  get: (id: string) => api.get(`/bookings/${id}`).then((r) => r.data as Booking),
  approve: (id: string) => api.post(`/bookings/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string) => api.post(`/bookings/${id}/reject`, { reason }).then((r) => r.data),
  confirm: (id: string) => api.post(`/bookings/${id}/confirm`, {}).then((r) => r.data),
  complete: (id: string) => api.post(`/bookings/${id}/complete`).then((r) => r.data),
  cancel: (id: string, reason?: string) => api.post(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),
};
// ============ Refunds ============
export interface Refund {
  id: string;
  paymentId: string;
  amountMinor: number;
  reason: string | null;
  status: string;
  createdAt: string;
  payment?: {
    id: string;
    provider: string;
    methodType: string;
    status: string;
    amountMinor: number;
    currency: string;
    booking?: {
      id: string;
      service?: { title: string; type: string };
      traveler?: { email: string };
    };
  };
}

export const refundsApi = {
  list: () => api.get("/refunds/admin").then((r) => r.data as Refund[]),
  process: (id: string) => api.post(`/refunds/${id}/process`).then((r) => r.data),
  succeed: (id: string) => api.post(`/refunds/${id}/succeed`).then((r) => r.data),
  fail: (id: string) => api.post(`/refunds/${id}/fail`).then((r) => r.data),
  create: (paymentId: string, amountMinor: number, reason?: string) =>
    api.post("/refunds", { paymentId, amountMinor, reason }).then((r) => r.data),
};

// ============ Commissions ============
export interface CommissionRule {
  id: string;
  scopeType: string;
  scopeId: string | null;
  basis: string;
  rateBps: number;
  fixedMinor: number;
  currency: string;
  activeFrom: string;
  activeTo: string | null;
}

export interface CommissionEntry {
  id: string;
  ruleId: string;
  bookingId: string;
  beneficiaryType: string;
  beneficiaryId: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  rule?: { rateBps: number };
  booking?: {
    service?: { title: string };
    traveler?: { email: string };
  };
}

export const commissionsApi = {
  listRules: () => api.get("/commissions/rules").then((r) => r.data as CommissionRule[]),
  createRule: (data: Partial<CommissionRule>) => api.post("/commissions/rules", data).then((r) => r.data),
  updateRule: (id: string, data: Partial<CommissionRule>) => api.patch(`/commissions/rules/${id}`, data).then((r) => r.data),
  listEntries: () => api.get("/commissions/entries").then((r) => r.data as CommissionEntry[]),
  markEligible: (id: string) => api.post(`/commissions/entries/${id}/eligible`).then((r) => r.data),
  markPaid: (id: string) => api.post(`/commissions/entries/${id}/paid`).then((r) => r.data),
};
// ============ Audit Logs ============
export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: any;
  ip: string | null;
  createdAt: string;
  actor?: { email: string | null; profile?: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null } | null;
}

export const auditLogsApi = {
  list: (params?: { action?: string; resourceType?: string; from?: string; to?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set("action", params.action);
    if (params?.resourceType) q.set("resourceType", params.resourceType);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    q.set("limit", String(params?.limit ?? 200));
    return api.get(`/audit-logs?${q.toString()}`).then((r) => r.data as { items: AuditLog[]; total: number });
  },
};