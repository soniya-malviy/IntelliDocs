import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem("token");
      
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        // Redirect to login page
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
