import { isConversationCall, isMissedCall, phonesMatchLoose, parseCallDurationSeconds } from "./callMetrics.js";
import { mapStageToId, PIPELINE_STAGE_DEFINITIONS } from "./pipelineStages.js";
import { isDateKeyInPeriod, localDateKey } from "./periodFilter.js";

/** Stages set manually / downstream — not auto-routed from call activity. */
export const ADVANCED_KANBAN_STAGES = new Set([
  "meeting_booked",
  "meeting_done",
  "proposal_sent",
  "objection",
  "advance_paid",
  "payment_complete",
  "not_interested",
]);

const CALL_COLUMN_PRIORITY = {
  conversation_2min: 3,
  not_pick: 2,
  lead: 1,
};

export function isEmployeeNewAssignedLead(lead) {
  if (!lead) return false;
  if (lead.acceptedAt || lead.accepted_at) return false;
  const assignStatus = String(lead.assignmentStatus || lead.assignment_status || "").toLowerCase();
  if (assignStatus === "accepted" || assignStatus === "in_progress") return false;
  const stage = String(lead.stage || lead.pipelineStage || lead.pipeline_stage || "").toLowerCase().trim();
  const inNewLeadStage = stage === "new lead" || stage === "new" || stage === "lead";
  if (!inNewLeadStage) return false;
  return assignStatus === "assigned" || assignStatus === "pending" || assignStatus === "unassigned";
}

export function isLeadCreatedInPeriod(lead, period = "month", now = new Date()) {
  const raw = lead?.createdAt || lead?.created_at;
  if (!raw) return false;
  const key = localDateKey(new Date(raw));
  return isDateKeyInPeriod(key, period, now);
}

export function isLeadActiveInPeriod(lead, period = "month", now = new Date()) {
  if (!lead) return false;
  const p = String(period || "month").toLowerCase();
  if (p === "month" || p === "all") return true;
  if (isEmployeeNewAssignedLead(lead)) return true;
  if (isLeadCreatedInPeriod(lead, period, now)) return true;
  return false;
}

export function resolveLeadForCall(call, leads = []) {
  if (!call) return null;
  const list = Array.isArray(leads) ? leads : [];
  if (call.leadId != null) {
    const byId = list.find((l) => String(l.id) === String(call.leadId));
    if (byId) return byId;
  }
  const callPhone = call.phone || call.clientPhone;
  if (callPhone) {
    const byPhone = list.find((l) => phonesMatchLoose(l.phone || l.clientPhone, callPhone));
    if (byPhone) return byPhone;
  }
  if (call.name) {
    const byName = list.find((l) => String(l.name || "").toLowerCase() === String(call.name).toLowerCase());
    if (byName) return byName;
  }
  return null;
}

export function getCallsForLead(lead, calls = []) {
  if (!lead || !Array.isArray(calls)) return [];
  return calls.filter((c) => {
    if (String(c.leadId) === String(lead.id)) return true;
    const leadPhone = lead.phone || lead.clientPhone;
    const callPhone = c.phone || c.clientPhone;
    if (leadPhone && callPhone && phonesMatchLoose(leadPhone, callPhone)) return true;
    return false;
  });
}

export function callKanbanColumn(call) {
  const sec = Number.isFinite(call?.durationSec)
    ? call.durationSec
    : parseCallDurationSeconds(call?.duration);
  if (isConversationCall(sec)) return "conversation_2min";
  if (isMissedCall(call)) return "not_pick";
  if (sec > 0) return "lead";
  return "not_pick";
}

export function leadHasConversation2MinPlus(calls = []) {
  return calls.some((c) => {
    const sec = Number.isFinite(c.durationSec) ? c.durationSec : parseCallDurationSeconds(c.duration);
    return isConversationCall(sec);
  });
}

export function leadHasNotPickCall(calls = []) {
  return calls.some((c) => isMissedCall(c));
}

export function filterMeetingsForPeriod(meetings = [], period = "month", now = new Date()) {
  const list = Array.isArray(meetings) ? meetings : [];
  return list.filter((m) => {
    if (m.status === "cancelled") return false;
    const raw = m.scheduledAt || m.date;
    if (!raw) return period === "month";
    const key = localDateKey(new Date(raw));
    return isDateKeyInPeriod(key, period, now);
  });
}

export function resolveLeadKanbanColumn(lead, calls = [], options = {}) {
  const { callScopedOnly = false } = options;
  if (!lead) return "lead";

  const rawStage = lead.pipelineStage || lead.stage || "";
  const dbStageId = mapStageToId(rawStage, lead.status);
  if (ADVANCED_KANBAN_STAGES.has(dbStageId)) return dbStageId;

  const leadCalls = getCallsForLead(lead, calls);

  if (leadHasConversation2MinPlus(leadCalls)) return "conversation_2min";
  if (leadHasNotPickCall(leadCalls)) return "not_pick";

  if (!callScopedOnly) {
    const s = String(rawStage || "").trim().toLowerCase();
    if (s === "not pick" || s === "not_pick") return "not_pick";
    if (
      s === "conversation_2min"
      || s.includes("conversation 2 min")
      || s === "conversation 2 min+"
    ) {
      return "conversation_2min";
    }
  }

  return "lead";
}

export function filterPipelineLeadsForPeriod(leads = [], periodCalls = [], period = "month", meetings = []) {
  const list = Array.isArray(leads) ? leads : [];
  const p = String(period || "month").toLowerCase();
  if (p === "month" || p === "all") return list;

  const periodMeetings = filterMeetingsForPeriod(meetings, period);
  const meetingLeadIds = new Set(
    periodMeetings.map((m) => String(m.leadId)).filter(Boolean),
  );

  return list.filter((lead) => {
    const id = String(lead.id);
    if (meetingLeadIds.has(id)) return true;
    if (isLeadActiveInPeriod(lead, period)) return true;
    return getCallsForLead(lead, periodCalls).length > 0;
  });
}

export function leadFromMeeting(meeting) {
  return {
    id: meeting.leadId || `meeting-${meeting.id}`,
    name: meeting.lead || meeting.title || "Meeting lead",
    company: meeting.company || "—",
    stage: "Meeting Booked",
    status: "warm",
    budget: "—",
    last: meeting.time || "Scheduled",
    source: "Meeting",
    _fromMeeting: true,
    _meetingId: meeting.id,
  };
}

export function resolveMeetingLead(meeting, allLeads = []) {
  if (!meeting) return null;
  const list = Array.isArray(allLeads) ? allLeads : [];
  if (meeting.leadId != null) {
    const byId = list.find((l) => String(l.id) === String(meeting.leadId));
    if (byId) return byId;
  }
  if (meeting.lead) {
    const name = String(meeting.lead).toLowerCase();
    const byName = list.find((l) => String(l.name || "").toLowerCase() === name);
    if (byName) return byName;
  }
  return leadFromMeeting(meeting);
}

export function resolveMeetingKanbanColumn(meeting, now = new Date()) {
  if (!meeting || meeting.status === "cancelled") return null;
  if (meeting.status === "completed") return "meeting_done";
  const outcome = String(meeting.outcome || "").toLowerCase();
  if (outcome.includes("completed") || outcome.includes("showed") || outcome.includes("done")) {
    return "meeting_done";
  }
  const at = new Date(meeting.scheduledAt || meeting.date);
  if (!Number.isNaN(at.getTime()) && at.getTime() < now.getTime()) {
    return "meeting_booked";
  }
  return "meeting_booked";
}

function placeMeetingsOnKanban(map, placed, allLeads, meetings, period, showLead) {
  const periodMeetings = filterMeetingsForPeriod(meetings, period);
  for (const meeting of periodMeetings) {
    const lead = resolveMeetingLead(meeting, allLeads);
    const col = resolveMeetingKanbanColumn(meeting);
    if (!col || !lead || !map[col]) continue;
    if (!showLead(lead)) continue;
    const id = String(lead.id);
    if (placed.has(id)) continue;
    map[col].push(lead);
    placed.add(id);
  }
  return periodMeetings;
}

function placeNewLeadsOnKanban(map, placed, leads, showLead) {
  for (const lead of leads) {
    const id = String(lead.id);
    if (placed.has(id)) continue;
    if (!isEmployeeNewAssignedLead(lead)) continue;
    if (!showLead(lead) || !map.lead) continue;
    map.lead.push(lead);
    placed.add(id);
  }
}

export function leadFromOrphanCall(call) {
  const phone = call.phone || call.clientPhone || "";
  const name = call.name || call.clientName || (phone ? phone.slice(-10) : "Unknown");
  return {
    id: `call-${call.id}`,
    name,
    company: call.company || "—",
    phone,
    stage: "Lead",
    status: "new",
    budget: "—",
    last: call.date || "Today",
    source: call.source || "Call",
    _fromCall: true,
    _callId: call.id,
  };
}

/**
 * Build kanban from Callyzer period calls (already server-filtered) + meetings.
 * Call columns match dashboard/Callyzer call counts; cards show unique leads per column.
 */
export function groupKanbanSyncedWithCallyzer(
  allLeads = [],
  periodCalls = [],
  meetings = [],
  options = {},
) {
  const {
    callScopedOnly = false,
    period = "month",
    visibleLeads = allLeads,
  } = options;
  const periodKey = String(period).toLowerCase();
  const isMonthView = periodKey === "month" || periodKey === "all";
  const map = Object.fromEntries(PIPELINE_STAGE_DEFINITIONS.map((s) => [s.id, []]));
  const placed = new Set();
  const visibleIds = new Set((visibleLeads || []).map((l) => String(l.id)));

  const showLead = (lead) => {
    if (!lead) return false;
    if (lead._fromCall || lead._fromMeeting) return true;
    return visibleIds.has(String(lead.id));
  };

  const pushLead = (col, lead) => {
    if (!lead || !map[col]) return;
    const id = String(lead.id);
    if (placed.has(id)) return;
    map[col].push(lead);
    placed.add(id);
  };

  if (isMonthView || !callScopedOnly) {
    if (isMonthView) {
      placeMeetingsOnKanban(map, placed, allLeads, meetings, periodKey, (lead) => {
        if (!lead) return false;
        if (lead._fromMeeting) return true;
        return visibleIds.has(String(lead.id));
      });
    }

    // Month / full pipeline: every lead by CRM stage, with month call activity for early columns.
    for (let i = 0; i < visibleLeads.length; i += 1) {
      const lead = visibleLeads[i];
      const id = lead?.id != null ? String(lead.id) : `lead-row-${i}`;
      if (placed.has(id)) continue;

      const dbStageId = mapStageToId(lead.pipelineStage || lead.stage, lead.status);
      const leadCalls = getCallsForLead(lead, periodCalls);

      let col = "lead";
      if (ADVANCED_KANBAN_STAGES.has(dbStageId) && dbStageId !== "meeting_booked" && dbStageId !== "meeting_done") {
        col = dbStageId;
      } else if (leadHasConversation2MinPlus(leadCalls)) {
        col = "conversation_2min";
      } else if (leadHasNotPickCall(leadCalls)) {
        col = "not_pick";
      } else if (dbStageId === "meeting_booked" || dbStageId === "meeting_done") {
        col = dbStageId;
      } else {
        col = resolveLeadKanbanColumn(lead, [], { callScopedOnly: false });
      }

      if (map[col]) {
        map[col].push(lead);
        placed.add(id);
      }
    }

    return map;
  }

  const periodMeetings = placeMeetingsOnKanban(map, placed, allLeads, meetings, period, showLead);

  const leadColumn = new Map();
  for (const call of periodCalls) {
    let lead = resolveLeadForCall(call, allLeads);
    if (!lead) continue;
    const id = String(lead.id);
    if (placed.has(id)) continue;

    const col = callKanbanColumn(call);
    const prev = leadColumn.get(id);
    if (!prev || CALL_COLUMN_PRIORITY[col] > CALL_COLUMN_PRIORITY[prev]) {
      leadColumn.set(id, col);
    }
  }

  for (const [id, col] of leadColumn) {
    const lead = allLeads.find((l) => String(l.id) === id);
    if (lead && showLead(lead)) pushLead(col, lead);
  }

  for (const lead of visibleLeads) {
    const id = String(lead.id);
    if (placed.has(id)) continue;
    const dbStageId = mapStageToId(lead.pipelineStage || lead.stage, lead.status);
    if (!ADVANCED_KANBAN_STAGES.has(dbStageId)) continue;
    if (dbStageId === "meeting_booked" || dbStageId === "meeting_done") continue;
    if (getCallsForLead(lead, periodCalls).length === 0) continue;
    pushLead(dbStageId, lead);
  }

  placeNewLeadsOnKanban(map, placed, visibleLeads, showLead);

  return map;
}

export function groupEmpLeadsKanban(leads, calls = [], options = {}) {
  const meetings = options.meetings || [];
  const period = String(options.period || "month").toLowerCase();
  const callScopedOnly = options.callScopedOnly ?? (period !== "month" && period !== "all");

  return groupKanbanSyncedWithCallyzer(leads, calls, meetings, {
    ...options,
    period,
    callScopedOnly,
    visibleLeads: options.visibleLeads || leads,
  });
}

export function countPipelineCallMetrics(periodCalls = []) {
  const list = Array.isArray(periodCalls) ? periodCalls : [];
  let conversations = 0;
  let missed = 0;
  let connected = 0;
  const conversationLeadIds = new Set();
  const missedLeadIds = new Set();

  for (const call of list) {
    const sec = Number.isFinite(call.durationSec)
      ? call.durationSec
      : parseCallDurationSeconds(call.duration);
    if (isConversationCall(sec)) {
      conversations += 1;
      if (call.leadId != null) conversationLeadIds.add(String(call.leadId));
    } else if (isMissedCall(call)) {
      missed += 1;
      if (call.leadId != null) missedLeadIds.add(String(call.leadId));
    } else if (sec > 0) {
      connected += 1;
    }
  }

  return {
    totalCalls: list.length,
    conversations,
    missed,
    connected,
    conversationLeads: conversationLeadIds.size,
    missedLeads: missedLeadIds.size,
  };
}

/** Stage pill counts — Today/Week use Callyzer call counts; Month uses column card counts. */
export function getPipelineStageDisplayCounts(
  grouped,
  { callyzerStats, callMetrics, periodMeetings = [], callScopedOnly = false } = {},
) {
  const counts = {};
  for (const stage of PIPELINE_STAGE_DEFINITIONS) {
    counts[stage.id] = grouped[stage.id]?.length ?? 0;
  }

  if (!callScopedOnly) {
    return counts;
  }

  counts.conversation_2min = callyzerStats?.conversations5MinPlus ?? callMetrics?.conversations ?? counts.conversation_2min;
  counts.not_pick = callyzerStats?.missedCalls ?? callMetrics?.missed ?? counts.not_pick;
  const booked = periodMeetings.filter((m) => resolveMeetingKanbanColumn(m) === "meeting_booked");
  const done = periodMeetings.filter((m) => resolveMeetingKanbanColumn(m) === "meeting_done");
  counts.meeting_booked = booked.length;
  counts.meeting_done = done.length;
  return counts;
}
