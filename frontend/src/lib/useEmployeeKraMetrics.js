import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api.js";
import { getPipelineQualifiedCount } from "./leadSync.js";

/**
 * Shared KRA metrics for Team + Incentives — same sources as employee panel.
 * - calls5Min: employee_calls conversations ≥ 5 min (Callyzer-synced)
 * - qualified: Booked + Showed up (pipelineQualified)
 * - meetings: Booked count (meetings scheduled)
 * - cash: cash_collections for selected month
 */
export function useEmployeeKraMetrics(employeeId, month, { enabled = true } = {}) {
  const [metrics, setMetrics] = useState({
    calls5Min: 0,
    totalCalls: 0,
    pickupRate: 0,
    avgDurationSec: 0,
    qualified: 0,
    booked: 0,
    showedUp: 0,
    meetings: 0,
    converted: 0,
    totalLeads: 0,
    cash: 0,
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || !employeeId) return;
    if (!silent) setLoading(true);

    try {
      const params = new URLSearchParams({ employee_id: String(employeeId) });
      const [leadsRes, callyzerRes, cashRes] = await Promise.all([
        apiGet(`/api/team/employees/leads?${params.toString()}`, {
          skipCache: true,
          cacheTtl: 0,
        }).catch(() => null),
        apiGet(
          `/api/team/employees/${employeeId}/callyzer-stats?${month ? `month=${month}` : "period=month"}`,
          { skipCache: true, cacheTtl: 0 },
        ).catch(() => null),
        month
          ? apiGet(`/api/incentives/employee/${employeeId}/cash-summary?month=${month}`, {
              skipCache: true,
              cacheTtl: 0,
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const stats = leadsRes?.stats || {};
      const stageBreakdown = leadsRes?.stageBreakdown || [];
      const cStats = callyzerRes?.stats || {};

      setMetrics({
        calls5Min: cStats.conversations5MinPlus ?? cStats.conversations5minPlus ?? 0,
        totalCalls: cStats.totalCalls ?? 0,
        pickupRate: cStats.pickupRate ?? 0,
        avgDurationSec: cStats.avgDurationSec ?? 0,
        qualified: getPipelineQualifiedCount(stats, stageBreakdown),
        booked: stats.booked ?? 0,
        showedUp: stats.showedUp ?? 0,
        meetings: stats.booked ?? 0,
        converted: stats.converted ?? 0,
        totalLeads: stats.totalLeads ?? 0,
        cash: cashRes?.cashCollected ?? 0,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [employeeId, month, enabled]);

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  return { metrics, loading, refresh: () => load({ silent: true }) };
}
