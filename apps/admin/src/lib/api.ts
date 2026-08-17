import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export const setTokens = (accessToken: string, refreshToken?: string) => {
  Cookies.set("access_token", accessToken, { expires: 1 });
  if (refreshToken) Cookies.set("refresh_token", refreshToken, { expires: 30 });
};

export const clearTokens = () => {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
};

api.interceptors.request.use((config: any) => {
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
          setTokens(data.accessToken, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          clearTokens();
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ============ Auth ============
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
  actor?: {
    email: string | null;
    profile?: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
  } | null;
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

// ============ Feature Flags ============
export interface FeatureFlag { key: string; enabled: boolean; updatedAt: string; }
export const featureFlagsApi = {
  list: () => api.get("/feature-flags").then((r) => r.data),
  get: (key: string) => api.get("/feature-flags/" + key).then((r) => r.data),
  set: (key: string, enabled: boolean) => api.put("/feature-flags/" + key, { enabled }).then((r) => r.data),
};

// ============ Search ============
export interface SearchHit { document: any; text_match: number; }
export interface SearchCollectionResult { collection: string; found: number; hits: SearchHit[]; }
export interface SearchResponse { results: SearchCollectionResult[]; }
export const searchApi = {
  query: (q: string) => api.get("/search", { params: { q } }).then((r) => r.data as SearchResponse),
  reindex: () => api.post("/search/reindex").then((r) => r.data),
};

// ============ Payments ============
export interface Payment {
  id: string; bookingId: string | null; tripId: string | null; provider: string;
  providerPaymentId: string | null; status: string; amountMinor: number; currency: string;
  methodType: string; createdAt: string;
  booking?: { id: string; status: string; traveler?: { email: string }; service?: { name: string; type: string }; };
}
export const paymentsApi = {
  adminList: () => api.get("/payments/admin").then((r) => r.data as Payment[]),
};

// ============ Analytics ============
export interface AnalyticsOverview {
  totals: { revenue: number; bookings: number; users: number; tickets: number; };
  revenueByDay: { date: string; total: number }[];
  paymentsByProvider: { provider: string; count: number; total: number }[];
  bookingsByStatus: { status: string; count: number }[];
  topServices: { name: string; count: number; revenue: number }[];
}
export const analyticsApi = {
  overview: (days = 14) => api.get(`/analytics/overview?days=${days}`).then((r) => r.data as AnalyticsOverview),
};

// ============ Notifications ============
export interface Notification {
  id: string; userId: string; channel: string; type: string;
  title: string; body: string; status: string; sentAt: string | null; readAt: string | null;
}
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.unreadOnly) q.set("unreadOnly", "true");
    if (params?.type) q.set("type", params.type);
    return api.get(`/notifications${q.toString() ? `?${q.toString()}` : ""}`).then((r) => r.data as { items: Notification[]; total: number });
  },
  unreadCount: () => api.get("/notifications/unread-count").then((r) => r.data as { count: number }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post("/notifications/read-all").then((r) => r.data),
  adminList: (params?: { type?: string; userId?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.userId) q.set("userId", params.userId);
    return api.get(`/notifications/admin${q.toString() ? `?${q.toString()}` : ""}`).then((r) => r.data as Notification[]);
  },
};

// ============ Support ============
export interface SupportReply {
  id: string; ticketId: string; authorId: string; body: string; isStaff: boolean; createdAt: string;
  author: { email: string; profile: { firstName: string | null; lastName: string | null } | null };
}
export interface SupportTicket {
  id: string; userId: string; tripId?: string | null; category: string; priority: string; status: string;
  assignedTo?: string | null; subject: string; body: string; createdAt: string; updatedAt: string;
  user: { email: string; profile: { firstName: string | null; lastName: string | null } | null };
  customerName?: string;
  replies?: SupportReply[]; _count?: { replies: number };
}
export const supportApi = {
  adminList: (params?: { status?: string; priority?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.priority) q.set("priority", params.priority);
    return api.get(`/support/admin${q.toString() ? `?${q.toString()}` : ""}`).then((r) => r.data as SupportTicket[]);
  },
  adminDetail: (id: string) => api.get(`/support/admin/${id}`).then((r) => r.data as SupportTicket),
  adminReply: (id: string, body: string) => api.post(`/support/admin/${id}/reply`, { body }).then((r) => r.data),
  adminUpdate: (id: string, update: { status?: string; priority?: string; assignedTo?: string | null }) =>
    api.patch(`/support/admin/${id}`, update).then((r) => r.data),
};

// ============ Services ============
export interface Service {
  id: string; title: string; description?: string | null; type: string; currency: string;
  priceMinor: number; status: string; metadata?: Record<string, unknown>; createdAt: string; updatedAt: string;
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
export interface ItineraryItem { id: string; type: string; title: string; startAt?: string; endAt?: string; location?: Record<string, unknown>; estimatedMinor?: number; }
export interface Itinerary { id: string; version: number; items: ItineraryItem[]; createdAt: string; }
export interface Trip {
  id: string; travelerId: string; title: string; destinationCountry: string;
  startAt?: string; endAt?: string; currency: string; budgetMinor: number; status: string; createdAt: string; updatedAt: string;
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
  id: string; email: string | null; phone: string | null; status: string; mfaEnabled: boolean; createdAt: string;
  firstName: string | null; lastName: string | null; avatarUrl: string | null; roles: string[];
  organization: string | null; tripsCount: number; bookingsCount: number; ticketsCount: number;
}
export interface UserDetail extends UserSummary {
  profile: any; trips: any[]; bookings: any[]; tickets: any[]; notifications: any[];
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
  id: string; userId: string; latitude: number; longitude: number;
  accuracy: number | null; source: string | null; battery: number | null; updatedAt: string; displayName: string;
  user: { id: string; email: string | null; phone: string | null; status: string;
    profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null; };
}
export const locationsApi = {
  list: (activeMinutes = 60) =>
    api.get(`/locations/admin?activeMinutes=${activeMinutes}`).then((r) => r.data as LiveLocation[]),
  getOne: (userId: string) => api.get(`/locations/admin/${userId}`).then((r) => r.data as LiveLocation | null),
};

// ============ Bookings ============
export interface BookingItem { id: string; description: string; quantity: number; unitMinor: number; taxMinor: number; feeMinor: number; }
export interface Booking {
  id: string; tripId?: string | null; travelerId: string; serviceId: string; providerId: string; status: string;
  externalRef?: string | null; totalMinor: number; currency: string; createdAt: string; updatedAt: string;
  service?: { title: string; type: string };
  traveler?: { email: string; profile?: { firstName: string | null; lastName: string | null } | null };
  items?: BookingItem[]; payments?: any[];
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
  id: string; paymentId: string; amountMinor: number; reason: string | null; status: string; createdAt: string;
  payment?: {
    id: string; provider: string; methodType: string; status: string; amountMinor: number; currency: string;
    booking?: { id: string; service?: { title: string; type: string }; traveler?: { email: string }; };
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
  id: string; scopeType: string; scopeId: string | null; basis: string;
  rateBps: number; fixedMinor: number; currency: string; activeFrom: string; activeTo: string | null;
}
export interface CommissionEntry {
  id: string; ruleId: string; bookingId: string; beneficiaryType: string; beneficiaryId: string;
  amountMinor: number; currency: string; status: string; createdAt: string;
  rule?: { rateBps: number }; booking?: { service?: { title: string }; traveler?: { email: string }; };
}
export const commissionsApi = {
  listRules: () => api.get("/commissions/rules").then((r) => r.data as CommissionRule[]),
  createRule: (data: Partial<CommissionRule>) => api.post("/commissions/rules", data).then((r) => r.data),
  updateRule: (id: string, data: Partial<CommissionRule>) => api.patch(`/commissions/rules/${id}`, data).then((r) => r.data),
  listEntries: () => api.get("/commissions/entries").then((r) => r.data as CommissionEntry[]),
  markEligible: (id: string) => api.post(`/commissions/entries/${id}/eligible`).then((r) => r.data),
  markPaid: (id: string) => api.post(`/commissions/entries/${id}/paid`).then((r) => r.data),
};

// ============ Staff Members ============
export interface StaffMember {
  id: string;
  accessCode: string | null;
  username: string;
  email: string | null;
  status: string;
  createdAt: string;
  features: string[];
  profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
  orgMembers: { role: string }[];
}

// ============ Features (per-account visibility) ============
export const ALL_FEATURES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "analytics", label: "Analytics" },
  { key: "services", label: "Services" },
  { key: "trips", label: "Trips" },
  { key: "bookings", label: "Bookings" },
  { key: "payments", label: "Payments" },
  { key: "refunds", label: "Refunds" },
  { key: "commissions", label: "Commissions" },
  { key: "users", label: "Users" },
  { key: "map", label: "Live Map" },
  { key: "notifications", label: "Notifications" },
  { key: "support", label: "Support" },
  { key: "flags", label: "Feature Flags" },
  { key: "audit", label: "Audit Logs" },
  { key: "staff", label: "Staff Management" },
  { key: "promos", label: "Promo Codes" },
  { key: "settings", label: "Settings" },
  { key: "reviews", label: "Reviews" },
  { key: "drivers", label: "Drivers" },
  { key: "finance", label: "Finance" },
];

// ============ Staff API (access code system) ============
export const staffApi = {
  accessLogin: (code: string, deviceId: string) =>
    api.post("/staff/access-login", { code, deviceId }).then((r) => r.data as { accessToken: string; refreshToken: string; user: any }),
  list: () => api.get("/staff").then((r) => r.data as StaffMember[]),
  create: (data: any) => api.post("/staff", data).then((r) => r.data as { id: string; accessCode: string }),
  update: (id: string, data: any) => api.patch(`/staff/${id}`, data).then((r) => r.data),
  regenerateCode: (id: string) => api.post(`/staff/${id}/regenerate-code`).then((r) => r.data as string),
  suspend: (id: string) => api.post(`/staff/${id}/suspend`).then((r) => r.data),
  reactivate: (id: string) => api.post(`/staff/${id}/reactivate`).then((r) => r.data),
  delete: (id: string) => api.delete(`/staff/${id}`).then((r) => r.data),
};
// ============ Settings ============
export const settingsApi = {
  get: () => api.get("/settings").then((r) => r.data as Record<string, any>),
  update: (data: Record<string, any>) => api.patch("/settings", data).then((r) => r.data),
};

// ============ Promo Codes ============
export interface PromoCode {
  id: string; code: string; kind: string; valueBps: number; amountMinor: number;
  currency: string; maxUses: number; usedCount: number; active: boolean;
  activeFrom: string; activeTo: string | null; createdAt: string;
}
export const promosApi = {
  list: () => api.get("/promos").then((r) => r.data as PromoCode[]),
  create: (data: any) => api.post("/promos", data).then((r) => r.data as PromoCode),
  update: (id: string, data: any) => api.patch(`/promos/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/promos/${id}`).then((r) => r.data),
  validate: (code: string, amountMinor: number) => api.post("/promos/validate", { code, amountMinor }).then((r) => r.data),
};
// ============ Reviews ============
export interface Review {
  id: string; rating: number; comment: string | null; targetType: string; createdAt: string;
  reviewer: { id: string; email: string | null; profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null } | null;
  booking: { id: string; service: { title: string; type: string } | null } | null;
}
export const reviewsApi = {
  list: (params?: any) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]: any) => v !== undefined && v !== "" && q.set(k, String(v)));
    return api.get(`/reviews?${q.toString()}`).then((r) => r.data as { items: Review[]; total: number });
  },
  detail: (id: string) => api.get(`/reviews/${id}`).then((r) => r.data),
  stats: () => api.get("/reviews/stats").then((r) => r.data),
  approve: (id: string) => api.post(`/reviews/${id}/approve`).then((r) => r.data),
  hide: (id: string) => api.post(`/reviews/${id}/hide`).then((r) => r.data),
  delete: (id: string) => api.delete(`/reviews/${id}`).then((r) => r.data),
};

// ============ Drivers ============
export interface Driver {
  userId: string; verificationStatus: string; licenseRef: string | null; rating: number | null; status: string;
  user: { id: string; email: string | null; phone: string | null; profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null };
  partner: { organizationId: string; legalName: string } | null;
  vehicles: any[];
  _count: { rides: number };
}
export const driversApi = {
  list: (params?: any) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]: any) => v !== undefined && v !== "" && q.set(k, String(v)));
    return api.get(`/drivers?${q.toString()}`).then((r) => r.data as { items: Driver[]; total: number });
  },
  detail: (id: string) => api.get(`/drivers/${id}`).then((r) => r.data),
  stats: () => api.get("/drivers/stats").then((r) => r.data),
  verify: (id: string, licenseRef?: string) => api.post(`/drivers/${id}/verify`, { licenseRef }).then((r) => r.data),
  reject: (id: string, reason: string) => api.post(`/drivers/${id}/reject`, { reason }).then((r) => r.data),
  setStatus: (id: string, status: string) => api.patch(`/drivers/${id}/status`, { status }).then((r) => r.data),
};




// ============ Partners ============
export interface Partner {
  id: string; legalName: string; displayName: string; type: string; status: string;
  country: string; metadata: any; createdAt: string;
  partner: {
    organizationId: string; partnerType: string; contractStatus: string; settlementTerms: any;
    _count: { services: number; drivers: number; vehicles: number; settlements: number };
  } | null;
}
export const partnersApi = {
  list: (params?: any) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]: any) => v !== undefined && v !== "" && q.set(k, String(v)));
    return api.get(`/partners?${q.toString()}`).then((r: any) => r.data as { items: Partner[]; total: number });
  },
  detail: (id: string) => api.get(`/partners/${id}`).then((r: any) => r.data),
  stats: () => api.get("/partners/stats").then((r: any) => r.data),
  create: (data: any) => api.post("/partners", data).then((r: any) => r.data),
  update: (id: string, data: any) => api.patch(`/partners/${id}`, data).then((r: any) => r.data),
  activate: (id: string) => api.post(`/partners/${id}/activate`).then((r: any) => r.data),
  suspend: (id: string) => api.post(`/partners/${id}/suspend`).then((r: any) => r.data),
};

export const partnersAssignApi = {
  assignDriver: (partnerId: string, driverUserId: string) =>
    api.post(`/partners/${partnerId}/drivers`, { driverUserId }).then((r: any) => r.data),
  unassignDriver: (partnerId: string, driverId: string) =>
    api.delete(`/partners/${partnerId}/drivers/${driverId}`).then((r: any) => r.data),
  assignService: (partnerId: string, serviceId: string) =>
    api.post(`/partners/${partnerId}/services`, { serviceId }).then((r: any) => r.data),
  createSettlement: (partnerId: string, data: any) =>
    api.post(`/partners/${partnerId}/settlements`, data).then((r: any) => r.data),
};


// ============ Settlements ============
export interface Settlement {
  id: string; periodStart: string; periodEnd: string;
  grossMinor: number; commissionMinor: number; netMinor: number;
  currency: string; status: string;
  partner: { organizationId: string; organization: { displayName: string; legalName: string } };
}
export const settlementsApi = {
  list: (params?: any) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]: any) => v !== undefined && v !== "" && q.set(k, String(v)));
    return api.get(`/settlements?${q.toString()}`).then((r: any) => r.data as { items: Settlement[]; total: number });
  },
  stats: () => api.get("/settlements/stats").then((r: any) => r.data),
  approve: (id: string) => api.post(`/settlements/${id}/approve`).then((r: any) => r.data),
  pay: (id: string) => api.post(`/settlements/${id}/pay`).then((r: any) => r.data),
};


// ============ Finance ============
export const financeApi = {
  summary: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return api.get(`/payments/admin/summary?${q.toString()}`).then((r: any) => r.data);
  },
  commissions: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return api.get(`/payments/admin/commissions?${q.toString()}`).then((r: any) => r.data);
  },
  taxFiling: (month: string) =>
    api.get(`/payments/admin/tax-filing?month=${month}`).then((r: any) => r.data),
  testWebhook: (provider: string) =>
    api.post(`/payments/test-webhook`, { provider }).then((r: any) => r.data),
  exportCsv: async (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await api.get(`/payments/admin/export/csv?${q.toString()}`, { responseType: "blob" });
    const url = URL.createObjectURL((res as any).data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kemraa-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
