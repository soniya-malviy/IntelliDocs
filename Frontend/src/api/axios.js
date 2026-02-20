import axios from "axios";

// Validate API URL is set
const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  console.error("⚠️ VITE_API_URL is not set in environment variables");
}

const api = axios.create({
  baseURL: apiUrl || "/api", // Fallback to relative path if not set
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // 60 second timeout for all requests (increased for PDF processing)
});

// Log API configuration in development
if (import.meta.env.DEV) {
  console.log("API Configuration:", {
    baseURL: api.defaults.baseURL,
    timeout: api.defaults.timeout,
  });
}

// Request interceptor - Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor - Handle 401 errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Don't handle 401 errors for login/register endpoints - let them handle their own errors
    const isAuthEndpoint = error.config?.url?.includes("/auth/login") || 
                          error.config?.url?.includes("/auth/register");
    
    // Handle 401 Unauthorized errors (but not for auth endpoints)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Clear invalid token
      localStorage.removeItem("token");
      
      // Dispatch custom event to notify AuthContext
      window.dispatchEvent(new Event("tokenCleared"));
      
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        // Use setTimeout to prevent multiple redirects and allow state updates
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
