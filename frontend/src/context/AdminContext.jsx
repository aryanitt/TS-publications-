import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getStoredAuthUser } from "../lib/crmContext.js";
import { adminProfileFromAuth } from "../lib/adminProfile.js";

const STORAGE_KEY = "ts_admin_profile";

export const DEFAULT_ADMIN = {
  id: "admin-1",
  initials: "AD",
  fullName: "Admin",
  role: "Super Admin",
  department: "Operations",
  email: "",
  phone: "",
  city: "",
  timezone: "Asia/Kolkata (IST)",
  loginId: "",
  joinedAt: null,
  lastLogin: null,
  permissions: [
    "Full dashboard access",
    "Team & employee management",
    "Incentive rule configuration",
    "SOP publish & archive",
    "Reports export",
    "Workspace settings",
  ],
  notifications: {
    emailNotifications: true,
    leadAssigned: true,
    meetingReminder: true,
    targetAchieved: false,
    weeklyDigest: true,
  },
  stats: {
    teamMembers: 0,
    rulesPublished: 0,
    actionsThisWeek: 0,
  },
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? { ...DEFAULT_ADMIN, ...JSON.parse(raw) } : { ...DEFAULT_ADMIN };
    const authUser = getStoredAuthUser();
    return authUser?.role === "admin" ? adminProfileFromAuth(authUser, stored) : stored;
  } catch {
    const authUser = getStoredAuthUser();
    const base = { ...DEFAULT_ADMIN };
    return authUser?.role === "admin" ? adminProfileFromAuth(authUser, base) : base;
  }
}

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(loadProfile);

  useEffect(() => {
    if (user?.role === "admin") {
      setAdmin((prev) => adminProfileFromAuth(user, prev));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(admin));
  }, [admin]);

  const updateAdmin = (patch) => setAdmin((prev) => ({ ...prev, ...patch }));

  const updateNotifications = (patch) =>
    setAdmin((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...patch },
    }));

  const value = useMemo(
    () => ({
      admin,
      updateAdmin,
      updateNotifications,
    }),
    [admin],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
