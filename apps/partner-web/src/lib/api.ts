import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export const setTokens = (accessToken: string, refreshToken?: string) => {
  Cookies.set("access_token", accessToken, { expires: 1, path: "/" });
  if (refreshToken) Cookies.set("refresh_token", refreshToken, { expires: 30, path: "/" });
};

export const clearTokens = () => {
  Cookies.remove("access_token", { path: "/" });
  Cookies.remove("refresh_token", { path: "/" });
};

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (typeof window !== "undefined") {
        clearTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const partnerAuthApi = {
  login: (email: string, password: string) =>
    api.post("/partner-auth/login", { email, password }).then((r) => r.data),
  me: () => api.get("/partner-profile").then((r) => r.data),
  logout: () => api.post("/partner-auth/logout"),
};

export const partnerAnalyticsApi = {
  overview: (period = "month", from?: string, to?: string) =>
    api.get(`/partner-analytics/overview?period=${period}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`).then((r) => r.data),
};

export const partnerFinanceApi = {
  summary: (period = "month", from?: string, to?: string) =>
    api.get(`/partner-finance/summary?period=${period}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`).then((r) => r.data),
  entries: (period = "month", from?: string, to?: string, status?: string) =>
    api.get(`/partner-finance/entries?period=${period}${status ? `&status=${status}` : ""}`).then((r) => r.data),
  settlements: (status?: string) =>
    api.get(`/partner-finance/settlements${status ? `?status=${status}` : ""}`).then((r) => r.data),
  overview: (period = "month") =>
    api.get(`/partner-finance/overview?period=${period}`).then((r) => r.data),
};

export const partnerServicesApi = {
  list: () => api.get("/partner-services").then((r) => r.data),
  detail: (id: string) => api.get(`/partner-services/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/partner-services", data).then((r) => r.data),
  activate: (id: string) => api.post(`/partner-services/${id}/activate`).then((r) => r.data),
  deactivate: (id: string) => api.post(`/partner-services/${id}/deactivate`).then((r) => r.data),
};

export const partnerBookingsApi = {
  list: () => api.get("/partner-bookings").then((r) => r.data),
  detail: (id: string) => api.get(`/partner-bookings/${id}`).then((r) => r.data),
  approve: (id: string) => api.post(`/partner-bookings/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason?: string) => api.post(`/partner-bookings/${id}/reject`, { reason }).then((r) => r.data),
  confirm: (id: string) => api.post(`/partner-bookings/${id}/confirm`).then((r) => r.data),
  complete: (id: string) => api.post(`/partner-bookings/${id}/complete`).then((r) => r.data),
};

export const partnerDriversApi = {
  list: (status?: string) => api.get(`/partner-drivers${status ? `?status=${status}` : ""}`).then((r) => r.data),
  detail: (userId: string) => api.get(`/partner-drivers/${userId}`).then((r) => r.data),
  updateStatus: (userId: string, status: string) => api.patch(`/partner-drivers/${userId}/status`, { status }).then((r) => r.data),
  verify: (userId: string, licenseRef?: string) => api.post(`/partner-drivers/${userId}/verify`, { licenseRef }).then((r) => r.data),
  stats: () => api.get("/partner-drivers/stats").then((r) => r.data),
};

export const partnerVehiclesApi = {
  list: () => api.get("/partner-vehicles").then((r) => r.data),
  detail: (id: string) => api.get(`/partner-vehicles/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/partner-vehicles", data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/partner-vehicles/${id}`, data).then((r) => r.data),
  assignDriver: (id: string, driverId: string) => api.post(`/partner-vehicles/${id}/assign-driver`, { driverId }).then((r) => r.data),
  remove: (id: string) => api.delete(`/partner-vehicles/${id}`).then((r) => r.data),
};

export const partnerRidesApi = {
  list: () => api.get("/partner-rides").then((r) => r.data),
  detail: (id: string) => api.get(`/partner-rides/${id}`).then((r) => r.data),
  stats: () => api.get("/partner-rides/stats").then((r) => r.data),
};

export const partnerContractsApi = {
  list: () => api.get("/partner-contracts").then((r) => r.data),
  detail: (id: string) => api.get(`/partner-contracts/${id}`).then((r) => r.data),
};

export const partnerReportsApi = {
  bookingsCsvUrl: (period = "month") => `${API_BASE}/partner-reports/bookings/csv?period=${period}`,
  earningsCsvUrl: (period = "month") => `${API_BASE}/partner-reports/earnings/csv?period=${period}`,
  cancellationsCsvUrl: (period = "month") => `${API_BASE}/partner-reports/cancellations/csv?period=${period}`,
  servicesCsvUrl: () => `${API_BASE}/partner-reports/services/csv`,
};

export const partnerReviewsApi = {
  list: (page = 1, limit = 20) => api.get(`/partner-reviews?page=${page}&limit=${limit}`).then((r) => r.data),
  stats: () => api.get("/partner-reviews/stats").then((r) => r.data),
};

export const partnerNotificationsApi = {
  list: () => api.get("/partner-notifications").then((r) => r.data),
  unreadCount: () => api.get("/partner-notifications/unread-count").then((r) => r.data),
  markRead: (id: string) => api.post(`/partner-notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post("/partner-notifications/read-all").then((r) => r.data),
};

export const partnerSupportApi = {
  list: () => api.get("/partner-support").then((r) => r.data),
  detail: (id: string) => api.get(`/partner-support/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/partner-support", data).then((r) => r.data),
  reply: (id: string, body: string) => api.post(`/partner-support/${id}/reply`, { body }).then((r) => r.data),
};

export const partnerTeamApi = {
  list: () => api.get("/partner-team").then((r) => r.data),
  create: (data: any) => api.post("/partner-team", data).then((r) => r.data),
  update: (userId: string, data: any) => api.patch(`/partner-team/${userId}`, data).then((r) => r.data),
  remove: (userId: string) => api.delete(`/partner-team/${userId}`).then((r) => r.data),
};

export const partnerWebhooksApi = {
  list: () => api.get("/partner-webhooks").then((r) => r.data),
  detail: (id: string) => api.get(`/partner-webhooks/${id}`).then((r) => r.data),
  emit: (data: any) => api.post("/partner-webhooks/emit", data).then((r) => r.data),
  ack: (id: string) => api.post(`/partner-webhooks/${id}/ack`).then((r) => r.data),
};
