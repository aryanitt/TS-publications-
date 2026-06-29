import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAuthToken, getStoredAuthUser, normalizeAuthUser } from "../lib/crmContext.js";
import PageLoader from "./PageLoader.jsx";

export default function RequireAuth({ roles }) {
  const { user: ctxUser, loading } = useAuth();
  const location = useLocation();
  const storedUser = getAuthToken() ? getStoredAuthUser() : null;
  const user = normalizeAuthUser(ctxUser || storedUser);

  if (loading && !storedUser) return <PageLoader />;

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/" : "/employee"} replace />;
  }

  return <Outlet />;
}
