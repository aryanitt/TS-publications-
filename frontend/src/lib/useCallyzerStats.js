import { useEffect, useState } from "react";
import { apiGet } from "./api.js";

export const CALLYZER_PERIOD_MAP = {
  Today: "today",
  "This Week": "week",
  "This Month": "month",
  today: "today",
  week: "week",
  month: "month",
};

// Global in-flight deduplication + result cache (per key)
const inflight = new Map();   // key → Promise
const resultCache = new Map(); // key → { data, ts }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function fetchCallyzerStats(employeeId, mapped) {
  const key = `callyzer_emp_${employeeId}_${mapped}`;

  // Return from cache if fresh
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  // De-duplicate in-flight requests
  if (inflight.has(key)) return inflight.get(key);

  const promise = apiGet(
    `/api/v1/employee/${employeeId}/callyzer/stats?period=${mapped}`,
    { cacheTtl: 300000 }
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

export function useCallyzerStats(employeeId, period, enabled = true) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!enabled || !employeeId) return undefined;

    const mapped = CALLYZER_PERIOD_MAP[period] || "today";
    let cancelled = false;
    setLoading(true);

    fetchCallyzerStats(employeeId, mapped)
      .then((data) => {
        if (cancelled) return;
        setConfigured(Boolean(data?.configured));
        setStats(data?.stats || null);
        setMessage(data?.message || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setStats(null);
          setMessage(err.message || "Could not load Callyzer stats");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId, period, enabled]);

  return { stats, loading, configured, message };
}

// Global in-flight deduplication for team stats
const teamInflight = new Map();
const teamResultCache = new Map();

function fetchCallyzerTeamStats(mapped) {
  const key = `callyzer_team_${mapped}`;

  const cached = teamResultCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  if (teamInflight.has(key)) return teamInflight.get(key);

  const promise = apiGet(
    `/api/v1/callyzer/team-stats?period=${mapped}`,
    { cacheTtl: 300000 }
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

  useEffect(() => {
    if (!enabled) return undefined;

    const mapped = CALLYZER_PERIOD_MAP[period] || period || "today";
    let cancelled = false;
    setLoading(true);

    fetchCallyzerTeamStats(mapped)
      .then((data) => {
        if (cancelled) return;
        setConfigured(Boolean(data?.configured));
        setStats(Array.isArray(data?.stats) ? data.stats : []);
      })
      .catch(() => {
        if (!cancelled) setStats([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, enabled]);

  return { stats, loading, configured };
}
