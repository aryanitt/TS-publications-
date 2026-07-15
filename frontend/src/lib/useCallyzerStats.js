import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api.js";

export const CALLYZER_PERIOD_MAP = {
  Today: "today",
  "This Week": "week",
  "This Month": "month",
  today: "today",
  week: "week",
  month: "month",
};

export const CALLYZER_POLL_INTERVAL_MS = 45_000;

// Global in-flight deduplication + result cache (per key)
const inflight = new Map();
const resultCache = new Map();
const CACHE_TTL = 45_000;

function fetchCallyzerStats(employeeId, mapped, { force = false } = {}) {
  const key = `callyzer_emp_${employeeId}_${mapped}`;

  if (force) {
    resultCache.delete(key);
  } else {
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Promise.resolve(cached.data);
    }
  }

  if (inflight.has(key)) return inflight.get(key);

  const promise = apiGet(
    `/api/v1/employee/${employeeId}/callyzer/stats?period=${mapped}`,
    { cacheTtl: force ? 0 : CACHE_TTL, skipCache: force },
  )
    .then((res) => {
      const data = res?.data ?? res;
      resultCache.set(key, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCallyzerStatsCache(employeeId, period) {
  if (employeeId != null && period != null) {
    const mapped = CALLYZER_PERIOD_MAP[period] || period || "today";
    resultCache.delete(`callyzer_emp_${employeeId}_${mapped}`);
    return;
  }
  resultCache.clear();
  teamResultCache.clear();
}

export function useCallyzerStats(employeeId, period, enabled = true) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState(null);

  const loadStats = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!enabled || !employeeId) return;

    const mapped = CALLYZER_PERIOD_MAP[period] || "today";
    if (!silent) setLoading(true);

    try {
      const data = await fetchCallyzerStats(employeeId, mapped, { force });
      setConfigured(Boolean(data?.configured));
      setStats(data?.stats || null);
      setMessage(data?.message || null);
    } catch (err) {
      if (!silent) {
        setStats(null);
        setMessage(err.message || "Could not load Callyzer stats");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [employeeId, period, enabled]);

  useEffect(() => {
    if (!enabled || !employeeId) return undefined;

    loadStats({ silent: false, force: false });

    const poll = () => {
      if (document.hidden) return;
      loadStats({ silent: true, force: true });
    };

    const intervalId = window.setInterval(poll, CALLYZER_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) {
        loadStats({ silent: true, force: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [employeeId, period, enabled, loadStats]);

  return { stats, loading, configured, message, refresh: () => loadStats({ silent: true, force: true }) };
}

const teamInflight = new Map();
const teamResultCache = new Map();

function fetchCallyzerTeamStats(mapped, { force = false } = {}) {
  const key = `callyzer_team_${mapped}`;

  if (force) {
    teamResultCache.delete(key);
  } else {
    const cached = teamResultCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Promise.resolve(cached.data);
    }
  }

  if (teamInflight.has(key)) return teamInflight.get(key);

  const promise = apiGet(
    `/api/v1/callyzer/team-stats?period=${mapped}`,
    { cacheTtl: force ? 0 : CACHE_TTL, skipCache: force },
  )
    .then((res) => {
      const data = res?.data ?? res;
      teamResultCache.set(key, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      teamInflight.delete(key);
    });

  teamInflight.set(key, promise);
  return promise;
}

export function useCallyzerTeamStats(period, enabled = true) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);

  const loadStats = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!enabled) return;

    const mapped = CALLYZER_PERIOD_MAP[period] || period || "today";
    if (!silent) setLoading(true);

    try {
      const data = await fetchCallyzerTeamStats(mapped, { force });
      setConfigured(Boolean(data?.configured));
      setStats(Array.isArray(data?.stats) ? data.stats : []);
    } catch {
      if (!silent) setStats([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [period, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    loadStats({ silent: false, force: false });

    const poll = () => {
      if (document.hidden) return;
      loadStats({ silent: true, force: true });
    };

    const intervalId = window.setInterval(poll, CALLYZER_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) loadStats({ silent: true, force: true });
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [period, enabled, loadStats]);

  return { stats, loading, configured, refresh: () => loadStats({ silent: true, force: true }) };
}
