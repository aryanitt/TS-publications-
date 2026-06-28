import { apiGet } from "./api.js";

/**
 * Fetch API data; on failure return fallback (mock). Keeps mock files as offline fallback.
 */
export async function fetchWithFallback(path, fallback, options = {}) {
  try {
    const data = await apiGet(path, { skipCache: true, cacheTtl: 0, ...options });
    return { data, source: "api", ok: true };
  } catch (err) {
    const fb = typeof fallback === "function" ? fallback() : fallback;
    return { data: fb, source: "mock", ok: false, error: err };
  }
}

export function mergeFilterData(mockFilterData, apiFilterData) {
  if (!apiFilterData) return mockFilterData;
  const keys = ["today", "week", "month"];
  const out = { ...mockFilterData };
  for (const key of keys) {
    if (apiFilterData[key]) {
      out[key] = {
        ...mockFilterData[key],
        ...apiFilterData[key],
        kpis: apiFilterData[key].kpis?.length
          ? apiFilterData[key].kpis
          : mockFilterData[key]?.kpis,
        leaderboard: apiFilterData[key].leaderboard?.length
          ? apiFilterData[key].leaderboard
          : mockFilterData[key]?.leaderboard,
        metrics: apiFilterData[key].metrics &&
          Object.keys(apiFilterData[key].metrics).length
          ? apiFilterData[key].metrics
          : mockFilterData[key]?.metrics,
        insights: apiFilterData[key].insights?.length
          ? apiFilterData[key].insights
          : mockFilterData[key]?.insights,
        activity: apiFilterData[key].activity?.length
          ? apiFilterData[key].activity
          : mockFilterData[key]?.activity,
      };
    }
  }
  return out;
}
