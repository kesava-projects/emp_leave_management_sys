const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: "include", // Ensures httpOnly cookies are sent
  };

  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  // Handle CSV/text downloads
  if (response.headers.get("content-type")?.includes("text/csv")) {
    if (!response.ok) {
      throw new Error("Failed to export CSV");
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error?.message || response.statusText || "Something went wrong";
    const error = new Error(errorMsg);
    error.code = data.error?.code || `HTTP_${response.status}`;
    error.status = response.status;
    error.details = data.error?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request("/api/auth/login", { method: "POST", body: credentials }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  getMe: () => request("/api/auth/me"),

  // Balances
  getMyBalances: (year) => request(`/api/balances/me${year ? `?year=${year}` : ""}`),

  // Requests
  getMyRequests: () => request("/api/requests"),
  calculateDays: (startDate, endDate, halfDay) =>
    request(`/api/requests/calculate-days?startDate=${startDate}&endDate=${endDate}&halfDay=${halfDay || "none"}`),
  createRequest: (body) => request("/api/requests", { method: "POST", body }),
  cancelRequest: (id, comment) =>
    request(`/api/requests/${id}/cancel`, { method: "PATCH", body: { comment } }),

  // Manager
  getManagerRequests: (status) =>
    request(`/api/manager/requests${status ? `?status=${status}` : ""}`),
  approveRequest: (id, comment) =>
    request(`/api/requests/${id}/approve`, { method: "PATCH", body: { comment } }),
  rejectRequest: (id, comment) =>
    request(`/api/requests/${id}/reject`, { method: "PATCH", body: { comment } }),

  // Calendar
  getCalendar: (month) => request(`/api/calendar${month ? `?month=${month}` : ""}`),

  // Admin CRUD
  getUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/users${qs ? `?${qs}` : ""}`);
  },
  createUser: (body) => request("/api/users", { method: "POST", body }),
  updateUser: (id, body) => request(`/api/users/${id}`, { method: "PATCH", body }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),

  getLeaveTypes: () => request("/api/leave-types"),
  createLeaveType: (body) => request("/api/leave-types", { method: "POST", body }),
  updateLeaveType: (id, body) => request(`/api/leave-types/${id}`, { method: "PATCH", body }),
  deleteLeaveType: (id) => request(`/api/leave-types/${id}`, { method: "DELETE" }),

  getHolidays: (year) => request(`/api/holidays${year ? `?year=${year}` : ""}`),
  createHoliday: (body) => request("/api/holidays", { method: "POST", body }),
  deleteHoliday: (id) => request(`/api/holidays/${id}`, { method: "DELETE" }),

  // Reports
  getReportsSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/reports/summary${qs ? `?${qs}` : ""}`);
  },
  exportReportsCsv: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/reports/export.csv${qs ? `?${qs}` : ""}`);
  },
};
