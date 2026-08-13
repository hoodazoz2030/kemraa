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