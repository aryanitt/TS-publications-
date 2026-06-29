import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, invalidateCache } from "../lib/api.js";
import {
  clearAuthStorage,
  clearEmployeeStorage,
  getAuthToken,
  getStoredAuthUser,
  normalizeAuthUser,
  storeAuthToken,
  storeAuthUser,
  storeEmployee,
} from "../lib/crmContext.js";

const AuthContext = createContext(null);

function syncEmployeeProfileFromAuth(user) {
  if (user?.role === "employee" && user.employeeId) {
    storeEmployee({
      id: user.employeeId,
      name: user.name || "Employee",
      email: user.email || "",
      role: user.employeeRole || "Sales Executive",
      department: user.department || "Sales",
    });
    return;
  }
  clearEmployeeStorage();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuthUser());
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = getAuthToken();
    const storedUser = getStoredAuthUser();
    const onLoginPage = typeof window !== "undefined" && window.location.pathname === "/login";

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (storedUser) {
      setUser(storedUser);
      syncEmployeeProfileFromAuth(storedUser);
    }

    // On the login screen, skip /me until after sign-in to avoid extra API calls.
    if (onLoginPage) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet("/api/auth/me", { skipCache: true, cacheTtl: 0, timeoutMs: 12000 });
      if (data?.user) {
        const nextUser = normalizeAuthUser(data.user);
        setUser(nextUser);
        storeAuthUser(nextUser);
        syncEmployeeProfileFromAuth(nextUser);
      }
    } catch {
      // Keep the stored session — /me can fail briefly during deploy or cold start.
      if (storedUser) {
        setUser(storedUser);
      } else {
        clearAuthStorage();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (loginId, password) => {
    clearEmployeeStorage();
    invalidateCache();
    const data = await apiPost("/api/auth/login", { loginId, password });
    if (!data?.token || !data?.user) {
      throw new Error(data?.message || "Login failed");
    }
    const nextUser = normalizeAuthUser(data.user);
    storeAuthToken(data.token);
    storeAuthUser(nextUser);
    syncEmployeeProfileFromAuth(nextUser);
    setUser(nextUser);
    setLoading(false);
    invalidateCache();
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    clearEmployeeStorage();
    setUser(null);
    invalidateCache();
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const data = await apiPost("/api/auth/change-password", { currentPassword, newPassword });
    if (!data?.success) {
      throw new Error(data?.message || "Could not update password");
    }
    if (data?.user) {
      const nextUser = normalizeAuthUser(data.user);
      setUser(nextUser);
      storeAuthUser(nextUser);
      syncEmployeeProfileFromAuth(nextUser);
    }
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, changePassword, refreshUser: bootstrap }),
    [user, loading, login, logout, changePassword, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
