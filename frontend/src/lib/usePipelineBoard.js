import { useEffect, useMemo, useRef, useState } from "react";
import {
  groupEmpLeadsKanban,
  filterPipelineLeadsForPeriod,
  filterMeetingsForPeriod,
  countPipelineCallMetrics,
  getPipelineStageDisplayCounts,
} from "./leadKanban.js";
import { dedupePeriodCalls } from "./callMetrics.js";

export const MAX_KANBAN_COLUMN_CARDS = 40;

const groupedCache = new Map();
const GROUPED_CACHE_MAX = 48;

const emptyGrouped = () => Object.fromEntries(
  ["lead", "not_pick", "conversation_2min", "meeting_booked", "meeting_done", "proposal_sent", "objection", "advance_paid", "payment_complete", "not_interested"].map((id) => [id, []]),
);

export function clearPipelineGroupedCache() {
  groupedCache.clear();
}

function groupedCacheKey(period, calls, leadsLen, meetingsLen, visibleLen, adminScope, groupRev = 0) {
  const first = calls[0]?.id ?? "";
  const last = calls[calls.length - 1]?.id ?? "";
  return `${period}:${adminScope ? "admin" : "emp"}:${calls.length}:${first}:${last}:${leadsLen}:${meetingsLen}:${visibleLen ?? "all"}:${groupRev}`;
}

function scheduleIdle(work, timeout = 80) {
  if (typeof requestIdleCallback !== "undefined") {
    return new Promise((resolve) => {
      const id = requestIdleCallback(() => resolve(work()), { timeout });
      scheduleIdle._cancel = () => cancelIdleCallback(id);
    });
  }
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(work()), 0);
    scheduleIdle._cancel = () => clearTimeout(id);
  });
}

/**
 * Shared pipeline kanban logic for admin + employee panels.
 * Heavy grouping runs in idle time so the UI stays responsive.
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
  groupRev = 0,
}) {
  const callScopedOnly = true;
  const periodLabel = period === "today" ? "Today" : period === "week" ? "This Week" : "This Month";

  const uniqueCalls = useMemo(
    () => dedupePeriodCalls(periodCalls),
    [periodCalls],
  );

  const visibleLen = visibleLeads?.length ?? null;
  const cacheKey = useMemo(
    () => groupedCacheKey(period, uniqueCalls, leads.length, meetings.length, visibleLen, adminScope, groupRev),
    [period, uniqueCalls, leads.length, meetings.length, visibleLen, adminScope, groupRev],
  );

  const [boardState, setBoardState] = useState(() => {
    const hit = groupedCache.get(cacheKey);
    if (hit) return hit;
    return {
      grouped: emptyGrouped(),
      baseLeads: [],
      callMetrics: countPipelineCallMetrics(uniqueCalls),
      periodMeetings: filterMeetingsForPeriod(meetings, period),
      stageDisplayCounts: {},
      grouping: true,
    };
  });
  const [grouping, setGrouping] = useState(() => !groupedCache.has(cacheKey));
  const reqRef = useRef(0);

  useEffect(() => {
    const hit = groupedCache.get(cacheKey);
    if (hit) {
      setBoardState(hit);
      setGrouping(false);
      return undefined;
    }

    const reqId = ++reqRef.current;
    setGrouping(true);

    let cancelled = false;
    (async () => {
      await scheduleIdle(() => {
        if (cancelled || reqId !== reqRef.current) return null;

        const periodMeetings = filterMeetingsForPeriod(meetings, period);
        const callMetrics = countPipelineCallMetrics(uniqueCalls);
        const grouped = groupEmpLeadsKanban(leads, uniqueCalls, {
          period,
          meetings,
          searchFiltered: visibleLeads,
          adminScope,
          includeUncontactedAssignments,
          employeeId,
          scopeCallsByAssignee,
        });
        const baseLeads = filterPipelineLeadsForPeriod(leads, uniqueCalls, period, meetings, null, {
          adminScope,
          includeUncontactedAssignments,
          employeeId,
          scopeCallsByAssignee,
        });
        const stageDisplayCounts = getPipelineStageDisplayCounts(grouped, {
          callyzerStats,
          callMetrics,
          periodMeetings,
        });

        return {
          grouped,
          baseLeads,
          callMetrics,
          periodMeetings,
          stageDisplayCounts,
          grouping: false,
        };
      }).then((result) => {
        if (cancelled || reqId !== reqRef.current || !result) return;
        groupedCache.set(cacheKey, result);
        if (groupedCache.size > GROUPED_CACHE_MAX) {
          groupedCache.delete(groupedCache.keys().next().value);
        }
        setBoardState(result);
        setGrouping(false);
      });
    })();

    return () => { cancelled = true; };
  }, [
    cacheKey,
    leads,
    visibleLeads,
    uniqueCalls,
    period,
    meetings,
    adminScope,
    includeUncontactedAssignments,
    employeeId,
    scopeCallsByAssignee,
    callyzerStats,
  ]);

  const { grouped, baseLeads, callMetrics, periodMeetings, stageDisplayCounts } = boardState;

  const filteredLeads = useMemo(() => {
    if (!visibleLeads) return baseLeads;
    const ids = new Set(baseLeads.map((l) => String(l.id)));
    return visibleLeads.filter((l) => ids.has(String(l.id)));
  }, [baseLeads, visibleLeads]);

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
    grouping,
    callsLoading,
  };
}

/** Slice column cards for render — full count still shown in column header. */
export function visibleKanbanColumnLeads(columnLeads = [], expanded = false) {
  const list = Array.isArray(columnLeads) ? columnLeads : [];
  if (expanded || list.length <= MAX_KANBAN_COLUMN_CARDS) return list;
  return list.slice(0, MAX_KANBAN_COLUMN_CARDS);
}

export function hiddenKanbanColumnCount(columnLeads = [], expanded = false) {
  const list = Array.isArray(columnLeads) ? columnLeads : [];
  if (expanded || list.length <= MAX_KANBAN_COLUMN_CARDS) return 0;
  return list.length - MAX_KANBAN_COLUMN_CARDS;
}
