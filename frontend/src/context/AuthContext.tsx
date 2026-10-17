"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: "rider" | "driver";
  wallet_balance: number;
  rating_avg: number;
  driver_id?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginAsRider: () => Promise<void>;
  loginAsDriver: () => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  loginAsRider: async () => {},
  loginAsDriver: async () => {},
  logout: () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        const data = await api.getSession();
        setUser(data);
      } else {
  setUser(null);
  setToken(null);
}
    } catch (e) {
      console.warn("Session check fallback:", e);
      setUser(null);
setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const loginAsRider = async () => {
    try {
      setLoading(true);
      const demoData = await api.getDemoTokens();
      if (demoData?.rider) {
        localStorage.setItem("token", demoData.rider.token);
        setToken(demoData.rider.token);
        setUser(demoData.rider.user);
      }
    } catch (e) {
      console.error("Login as rider failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDriver = async () => {
    try {
      setLoading(true);
      const demoData = await api.getDemoTokens();
      if (demoData?.driver) {
        localStorage.setItem("token", demoData.driver.token);
        setToken(demoData.driver.token);
        setUser(demoData.driver.user);
      }
    } catch (e) {
      console.error("Login as driver failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginAsRider,
        loginAsDriver,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
