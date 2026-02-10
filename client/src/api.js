import axios from "axios";

// IMPORTANT: Create axios instance with base URL for API requests
const api = axios.create({
  baseURL: "/api",
});

// NOTE: Interceptor to attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// IMPORTANT: Response interceptor to handle blocked/deleted user redirection
// NOTA BENE: If server responds with redirect flag, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data && error.response.data.redirect) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
