import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ts_admin_profile";

export const DEFAULT_ADMIN = {
  id: "admin-1",
  initials: "AC",
  fullName: "Alex Chen",
  role: "Super Admin",
  department: "Operations",
  email: "alex.chen@tspublication.in",
  phone: "+91 98765 43210",
  city: "Mumbai",
  timezone: "Asia/Kolkata (IST)",
  joinedAt: "2024-03-12",
  lastLogin: "2026-06-19T09:42:00",
  authProvider: "google",
  googleConnected: false,
  googleEmail: "",
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
  sessions: [
    { id: 1, device: "Windows · Chrome", location: "Mumbai, IN", current: true, lastActive: "Active now" },
    { id: 2, device: "iPhone · Safari", location: "Mumbai, IN", current: false, lastActive: "2 days ago" },
  ],
  stats: {
    teamMembers: 24,
    rulesPublished: 12,
    actionsThisWeek: 47,
  },
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADMIN;
    return { ...DEFAULT_ADMIN, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADMIN;
  }
}

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(loadProfile);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(admin));
  }, [admin]);

  const updateAdmin = (patch) => setAdmin((prev) => ({ ...prev, ...patch }));

  const updateNotifications = (patch) =>
    setAdmin((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...patch },
    }));

  const connectGoogle = (email = "alex.chen@gmail.com") =>
    setAdmin((prev) => ({
      ...prev,
      googleConnected: true,
      googleEmail: email,
      authProvider: "google",
      lastLogin: new Date().toISOString(),
    }));

  const disconnectGoogle = () =>
    setAdmin((prev) => ({
      ...prev,
      googleConnected: false,
      googleEmail: "",
    }));

  const value = useMemo(
    () => ({
      admin,
      updateAdmin,
      updateNotifications,
      connectGoogle,
      disconnectGoogle,
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
