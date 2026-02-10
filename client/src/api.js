import axios from "axios";

// IMPORTANT: Create axios instance with base URL for API requests
// NOTE: In production, REACT_APP_API_URL points to the Render backend
// In development, proxy in package.json handles it
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
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
