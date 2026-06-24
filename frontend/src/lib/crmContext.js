/** Shared CRM tenant/user headers for admin + employee panels. */

const EMPLOYEE_STORAGE_KEY = "crm_current_employee_v1";

export function getStoredEmployee() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeEmployee(employee) {
  if (typeof window === "undefined" || !employee) return;
  try {
    window.localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(employee));
  } catch {
    // ignore
  }
}

export function getCrmHeaders(role = "employee") {
  const emp = getStoredEmployee();
  if (role === "admin") {
    return {
      "x-tenant-id": "default",
      "x-user-id": "admin",
      "x-user-name": "Admin",
      "x-user-role": "admin",
    };
  }
  return {
    "x-tenant-id": "default",
    "x-user-id": String(emp?.id ?? ""),
    "x-user-name": emp?.name || "Employee",
    "x-user-role": "employee",
  };
}

export function getAdminCrmHeaders() {
  return getCrmHeaders("admin");
}

export function mapApiEmployee(row) {
  if (!row) return null;
  const name = row.name || "Employee";
  const initials = row.initials
    || name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return {
    id: row.id,
    name,
    role: row.role || "Sales Executive",
    initials,
    email: row.email || "",
    phone: row.phone || "",
    department: row.department || "Sales",
    avatarColor: "#2563eb",
  };
}
