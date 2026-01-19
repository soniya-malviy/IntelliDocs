
import React from "react";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(
    localStorage.getItem("token") ? true : null
  );

  // Listen for storage changes (when token is cleared by interceptor)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token" && !e.newValue) {
        setUser(null);
      } else if (e.key === "token" && e.newValue) {
        setUser(true);
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event (from same tab)
    const handleTokenCleared = () => {
      setUser(null);
    };
    window.addEventListener("tokenCleared", handleTokenCleared);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("tokenCleared", handleTokenCleared);
    };
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    setUser(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
