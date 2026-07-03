import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
    ? `${process.env.REACT_APP_API_URL}/api`
    : "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  res => res,
  async err => {
    // Skip retry for auth/me (used for initial session check) to avoid flash loops
    const isAuthCheck = err.config?.url?.includes("/auth/me");
    if (err.response?.status === 401 && !err.config._retry && !isAuthCheck) {
      err.config._retry = true;
      try {
        // Use the api instance (not raw axios) so the correct baseURL is used
        await api.post("/auth/refresh", {});
        return api(err.config);
      } catch {
        // Only redirect if NOT already on the login page (prevents infinite reload loop)
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
