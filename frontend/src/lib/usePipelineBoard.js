import { useMemo } from "react";
import {
  groupEmpLeadsKanban,
  filterPipelineLeadsForPeriod,
  filterMeetingsForPeriod,
  countPipelineCallMetrics,
  getPipelineStageDisplayCounts,
} from "./leadKanban.js";
import { dedupePeriodCalls } from "./callMetrics.js";

const groupedCache = new Map();
const GROUPED_CACHE_MAX = 24;

export function clearPipelineGroupedCache() {
  groupedCache.clear();
}

function groupedCacheKey(period, calls, leadsLen, meetingsLen, visibleLen, adminScope) {
  const first = calls[0]?.id ?? "";
  const last = calls[calls.length - 1]?.id ?? "";
  return `${period}:${adminScope ? "admin" : "emp"}:${calls.length}:${first}:${last}:${leadsLen}:${meetingsLen}:${visibleLen ?? "all"}`;
}

function getCachedGrouped(key, compute) {
  const hit = groupedCache.get(key);
  if (hit) return hit;
  const result = compute();
  groupedCache.set(key, result);
  if (groupedCache.size > GROUPED_CACHE_MAX) {
    const oldest = groupedCache.keys().next().value;
    groupedCache.delete(oldest);
  }
  return result;
}

/**
 * Shared pipeline kanban logic for admin + employee panels.
 * Keeps period filtering, Callyzer call metrics, and column grouping in sync.
 */
export function usePipelineBoard({
  leads = [],
  period = "month",
  periodCalls = [],
  callsLoading = false,
  callyzerStats = null,
  meetings = [],
  adminScope = false,
  includeUncontactedAssignments = true,
  visibleLeads = null,
  employeeId = null,
  scopeCallsByAssignee = false,
}) {
  const callScopedOnly = true;
  const periodLabel = period === "today" ? "Today" : period === "week" ? "This Week" : "This Month";

  const uniqueCalls = useMemo(
    () => dedupePeriodCalls(periodCalls),
    [periodCalls],
  );

  const visibleLen = visibleLeads?.length ?? null;
  const grouped = useMemo(
    () => getCachedGrouped(
      groupedCacheKey(period, uniqueCalls, leads.length, meetings.length, visibleLen, adminScope),
      () => groupEmpLeadsKanban(leads, uniqueCalls, {
        period,
        meetings,
        searchFiltered: visibleLeads,
        adminScope,
        includeUncontactedAssignments,
        employeeId,
        scopeCallsByAssignee,
      }),
    ),
    [leads, visibleLeads, visibleLen, uniqueCalls, period, meetings, adminScope, includeUncontactedAssignments, employeeId, scopeCallsByAssignee],
  );

  const callMetrics = useMemo(
    () => countPipelineCallMetrics(uniqueCalls),
    [uniqueCalls],
  );

  const baseLeads = useMemo(
    () => filterPipelineLeadsForPeriod(leads, uniqueCalls, period, meetings, null, {
      adminScope,
      includeUncontactedAssignments,
      employeeId,
      scopeCallsByAssignee,
    }),
    [leads, period, uniqueCalls, meetings, adminScope, includeUncontactedAssignments, employeeId, scopeCallsByAssignee],
  );

  const filteredLeads = useMemo(() => {
    if (!visibleLeads) return baseLeads;
    const ids = new Set(baseLeads.map((l) => String(l.id)));
    return visibleLeads.filter((l) => ids.has(String(l.id)));
  }, [baseLeads, visibleLeads]);

  const periodMeetings = useMemo(
    () => filterMeetingsForPeriod(meetings, period),
    [meetings, period],
  );

  const stageDisplayCounts = useMemo(
    () => getPipelineStageDisplayCounts(grouped, {
      callyzerStats,
      callMetrics,
      periodMeetings,
    }),
    [grouped, callyzerStats, callMetrics, periodMeetings],
  );

  // Prefer live call-list metrics when we have calls (DB is source of truth for kanban).
  const hasCalls = Array.isArray(periodCalls) && periodCalls.length > 0;
  const statsConv = Number(callyzerStats?.conversations5MinPlus);
  const statsNotPick = Number(callyzerStats?.notPickupByClient);
  const syncedConversationCalls = hasCalls
    ? (callMetrics.conversations || 0)
    : ((Number.isFinite(statsConv) && statsConv > 0) ? statsConv : (callMetrics.conversations || 0));
  const syncedNotPickupCalls = hasCalls
    ? (callMetrics.notPickupByClient || 0)
    : ((Number.isFinite(statsNotPick) && statsNotPick > 0) ? statsNotPick : (callMetrics.notPickupByClient || 0));
  const syncedConversationLeads = grouped.conversation_2min?.length ?? callMetrics.conversationLeads ?? 0;
  const syncedNotPickupLeads = grouped.not_pick?.length ?? callMetrics.notPickupLeads ?? 0;

  return {
    callScopedOnly,
    periodLabel,
    baseLeads,
    filteredLeads,
    grouped,
    callMetrics,
    periodMeetings,
    stageDisplayCounts,
    syncedConversationCalls,
    syncedConversationLeads,
    syncedNotPickupCalls,
    syncedNotPickupLeads,
  };
}
