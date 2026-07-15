import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api.js";

const PERIOD_QUERY = {
  day: "period=today",
  today: "period=today",
  week: "period=week",
  month: "period=month",
};

export function teamCallyzerPeriodQuery(period, month) {
  if (month) return `month=${month}`;
  return PERIOD_QUERY[period] || PERIOD_QUERY.month;
}

/** Per-employee Callyzer stats for Team Management (admin API, DB-backed). */
export function useTeamEmployeeCallyzerStats(employeeId, period = "month", enabled = true) {
  const [stats, setStats] = useState(null);
  const [employeeName, setEmployeeName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || !employeeId) return;
    if (!silent) setLoading(true);

    try {
      const data = await apiGet(
        `/api/team/employees/${employeeId}/callyzer-stats?${teamCallyzerPeriodQuery(period)}`,
        { skipCache: true, cacheTtl: 0 },
      );
      setConfigured(Boolean(data?.configured ?? true));
      setStats(data?.stats || null);
      setEmployeeName(data?.employeeName || data?.stats?.empName || null);
      setMessage(data?.message || null);
    } catch (err) {
      if (!silent) {
        setStats(null);
        setMessage(err.message || "Could not load employee call stats");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [employeeId, period, enabled]);

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  return { stats, employeeName, loading, configured, message, refresh: () => load({ silent: true }) };
}

/** All employees' call stats for Team Management overview table. */
export function useTeamCallyzerStats(period = "today", enabled = true) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [periodLabel, setPeriodLabel] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return;
    if (!silent) setLoading(true);

    try {
      const data = await apiGet(
        `/api/team/callyzer-stats?${teamCallyzerPeriodQuery(period)}`,
        { skipCache: true, cacheTtl: 0 },
      );
      setConfigured(Boolean(data?.configured ?? true));
      setStats(Array.isArray(data?.stats) ? data.stats : []);
      setPeriodLabel(data?.label || "");
    } catch {
      if (!silent) setStats([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [period, enabled]);

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  return { stats, loading, configured, periodLabel, refresh: () => load({ silent: true }) };
}
