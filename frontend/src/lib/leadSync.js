import {
  formatEmpPipelineValue,
  parseEmpBudget,
  EMP_KANBAN_STAGES,
} from "../data/employeeMock.js";
import {
  ADMIN_PIPELINE_TO_DB_STAGE,
  mapStageToId,
  normalizeStageLabel,
} from "./pipelineStages.js";

/** Canonical pipeline_stage values written to DB (employee kanban labels). */
export const CANONICAL_STAGE_LABELS = EMP_KANBAN_STAGES.map((s) => s.label);

export { ADMIN_PIPELINE_TO_DB_STAGE };

export function adminPipelineIdToDbStage(adminStageId) {
  return ADMIN_PIPELINE_TO_DB_STAGE[adminStageId] || normalizeStageLabel(adminStageId);
}

/** Normalize any legacy stage string to canonical employee label for display/storage. */
export function normalizeToCanonicalStage(raw, status = "") {
  return normalizeStageLabel(raw, status);
}

export function getPipelineQualifiedCount(stats, stageBreakdown) {
  if (stats?.pipelineQualified != null) return stats.pipelineQualified;
  if (Array.isArray(stageBreakdown) && stageBreakdown.length) {
    const booked = stageBreakdown.find((s) => s.id === "meeting_booked" || String(s.label || "").includes("Meeting Booked"))?.count || 0;
    const done = stageBreakdown.find((s) => s.id === "meeting_done" || String(s.label || "").includes("Meeting Done"))?.count || 0;
    return booked + done;
  }
  if (stats?.booked != null || stats?.showedUp != null || stats?.meetingDone != null) {
    return (stats.booked || stats.meetingBooked || 0) + (stats.showedUp || stats.meetingDone || 0);
  }
  return 0;
}

const AVATAR_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#7c3aed", "#dc2626", "#0ea5e9", "#64748b"];

export function normalizeTemperature(raw) {
  const s = String(raw || "").toLowerCase();
  if (s.includes("hot")) return "hot";
  if (s.includes("cold")) return "cold";
  if (s === "notpick" || s.includes("not pick")) return "notpick";
  if (s === "converted") return "converted";
  if (s === "ni" || s.includes("not interested")) return "ni";
  return "warm";
}

export function temperatureToApi(status) {
  const map = {
    hot: "Hot Lead",
    warm: "Warm Lead",
    cold: "Cold Lead",
    notpick: "Not Pick",
    converted: "Payment Complete",
    ni: "Not Interested",
  };
  return map[status] || "Warm Lead";
}

export function workflowStatusFromTemperature(status) {
  return temperatureToApi(status);
}

export function formatRelativeTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function unwrapApiData(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.leads)) return res.leads;
  if (Array.isArray(res?.employees)) return res.employees;
  if (res?.data && typeof res.data === "object") return res.data;
  return res?.data ?? [];
}

/** Extract a list array from common API envelope shapes. Returns null when not a list. */
export function unwrapApiList(res) {
  const direct = unwrapApiData(res);
  if (Array.isArray(direct)) return direct;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.leads)) return res.data.leads;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.leads)) return res.leads;
  return null;
}

/** Extract employee workspace/dashboard payload from API envelopes. */
export function unwrapWorkspacePayload(res) {
  if (!res || typeof res !== "object") return null;
  if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
    return res.data;
  }
  if (Array.isArray(res.leads) || res.employee || res.tasks || res.calls) {
    return res;
  }
  return null;
}

/** Replace list on fetch — used for per-employee workspace (no cross-user merge). */
export function replaceFetchedList(prev, next) {
  if (!Array.isArray(next)) return Array.isArray(prev) ? prev : [];
  return next;
}

/** Keep existing rows when a refetch returns empty (avoids wiping good data on race/429). */
export function mergeFetchedList(prev, next) {
  if (!Array.isArray(next)) return prev;
  if (next.length === 0 && Array.isArray(prev) && prev.length > 0) return prev;
  return next;
}

const WORKFLOW_STATUS = new Set(["notpick", "converted", "ni", "new", "attempted", "contacted", "booked"]);

function workflowStatusFromStage(stageRaw) {
  const s = String(stageRaw || "").toLowerCase();
  if (!s) return null;
  if (s === "new lead" || s === "new" || s === "lead") return "new";
  if (s.includes("not pick")) return "notpick";
  if (s.includes("attempted")) return "attempted";
  if (s.includes("contacted") || s.includes("qualified") || s.includes("conversation")) return "contacted";
  if (s.includes("booked") || s.includes("call booked") || s.includes("meeting booked")) return "booked";
  if (s.includes("showed up") || s.includes("showed-up") || s.includes("show up") || s.includes("meeting done")) {
    return "showed_up";
  }
  if (s.includes("proposal")) return "proposal";
  if (s.includes("objection") || s.includes("negotiation")) return "negotiation";
  if (s.includes("payment complete") || s.includes("converted") || s === "won") return "converted";
  if (s.includes("closed") || s.includes("not interested")) return "ni";
  return null;
}

function normalizeEmployeeLeadStatus(lead) {
  const fromStage = workflowStatusFromStage(
    lead.pipelineStage || lead.pipeline_stage || lead.stage,
  );
  if (fromStage) return fromStage;
  const raw = String(lead.status || lead.lead_status || "").toLowerCase().trim();
  if (raw === "notpick" || raw.includes("not pick")) return "notpick";
  if (raw === "converted" || raw.includes("payment complete")) return "converted";
  if (raw === "ni" || raw.includes("not interested")) return "ni";
  if (raw === "new") return "new";
  if (WORKFLOW_STATUS.has(raw)) return raw;
  return normalizeTemperature(lead.temperature || lead.status);
}

export function apiLeadToEmployee(lead, avatarColors = AVATAR_COLORS) {
  const name = lead.leadName || lead.lead_name || "Lead";
  const id = lead.id;
  const av = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const rawStage = lead.pipelineStage || lead.pipeline_stage || lead.stage || "Lead";
  const status = normalizeEmployeeLeadStatus(lead);
  const stage = normalizeToCanonicalStage(rawStage, lead.status || status);
  const revenue = Number(lead.expectedRevenue ?? lead.expected_revenue ?? 0);

  return {
    id,
    name,
    company: lead.companyName || lead.company_name || "—",
    status,
    stage,
    source: lead.source || "Website",
    budget: revenue > 0 ? formatEmpPipelineValue(revenue) : "—",
    service: lead.requirements || lead.insights || lead.sourceMeta?.service || "—",
    last: formatRelativeTime(lead.lastActivityAt || lead.updatedAt || lead.createdAt),
    av,
    color: avatarColors[Number(id) % avatarColors.length],
    phone: lead.phone || "",
    email: lead.email || "",
    city: lead.city || "",
    country: lead.country || "India",
    assignee: typeof lead.assignedTo === "object"
      ? lead.assignedTo.name
      : (lead.assignee_name || lead.assigneeName || ""),
    assigneeId: (() => {
      const raw = lead.assignedTo ?? lead.assigned_to ?? lead.assigneeId ?? lead.assignee_id;
      if (raw == null) return null;
      if (typeof raw === "object") return raw.id ?? raw._id ?? null;
      return raw;
    })(),
    pipelineStage: stage,
    temperature: lead.temperature,
    expectedRevenue: revenue,
    winProbability: lead.winProbability ?? lead.win_probability,
    nextFollowUpAt: lead.nextFollowUpAt || lead.next_follow_up_at,
    createdAt: lead.createdAt || lead.created_at,
    updatedAt: lead.updatedAt || lead.updated_at,
    assignmentStatus: lead.assignmentStatus || lead.assignment_status,
    assignedAt: lead.assignedAt || lead.assigned_at,
    acceptedAt: lead.acceptedAt || lead.accepted_at,
    _api: true,
  };
}

export function apiLeadToAdmin(lead) {
  const assignedTo = lead.assignedTo;
  const employeeName =
    (typeof assignedTo === "object" && assignedTo?.name) ||
    lead.assigneeName ||
    lead.assignee_name ||
    "";
  return {
    id: lead.id,
    lead_name: lead.leadName || lead.lead_name,
    company_name: lead.companyName || lead.company_name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    country: lead.country,
    source: lead.source,
    form_name: lead.formName || lead.form_name,
    pipeline_stage: normalizeToCanonicalStage(
      lead.pipelineStage || lead.pipeline_stage,
      lead.status,
    ),
    temperature: lead.temperature,
    status: lead.status,
    expected_revenue: lead.expectedRevenue ?? lead.expected_revenue,
    win_probability: lead.winProbability ?? lead.win_probability,
    created_at: lead.createdAt || lead.created_at,
    next_followup_date: lead.nextFollowUpAt || lead.next_follow_up_at,
    requirements: lead.requirements,
    assignedTo,
    assignee_name: employeeName,
    employeeName,
    assignment_status: lead.assignmentStatus || lead.assignment_status,
  };
}

export function employeeStagePatch(stageLabel, currentStatus) {
  const canonical = normalizeToCanonicalStage(stageLabel, currentStatus);
  return {
    stage: canonical,
    pipelineStage: canonical,
    status: canonical,
    employeeStatus: canonical,
  };
}

export function apiEmployeeToAdmin(emp) {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    department: emp.department,
    status: emp.status,
  };
}

/** Fetch all leads from paginated /api/v1/leads (admin lists were capped at 200). */
export async function fetchAllLeads(apiGetFn, { headers, pageSize = 500, maxPages = 40, extraQuery = {} } = {}) {
  const all = [];
  let page = 1;

  while (page <= maxPages) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...Object.fromEntries(
        Object.entries(extraQuery).filter(([, v]) => v != null && v !== ""),
      ),
    });
    const res = await apiGetFn(`/api/v1/leads?${params.toString()}`, {
      headers,
      skipCache: true,
      cacheTtl: 0,
    });
    const items = unwrapApiData(res);
    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);

    const total = Number(res?.total);
    if (Number.isFinite(total) && all.length >= total) break;
    if (items.length < pageSize) break;
    page += 1;
  }

  return all;
}

/** Fetch all leads for an employee (paginates when API returns partial pages). */
export async function fetchAllEmployeeLeads(apiGetFn, employeeId, { headers, pageSize = 500, maxPages = 40, extraQuery = {} } = {}) {
  if (!employeeId) return [];

  const extra = Object.fromEntries(
    Object.entries(extraQuery).filter(([, v]) => v != null && v !== ""),
  );
  const extraQs = new URLSearchParams(extra).toString();
  const bulkPath = `/api/v1/employee/${employeeId}/leads${extraQs ? `?${extraQs}` : ""}`;
  const bulkRes = await apiGetFn(bulkPath, { headers, skipCache: true, cacheTtl: 0 });
  const bulkItems = unwrapApiData(bulkRes);
  const bulkTotal = Number(bulkRes?.total);

  if (Array.isArray(bulkItems) && bulkItems.length) {
    if (!Number.isFinite(bulkTotal) || bulkItems.length >= bulkTotal) return bulkItems;
  }

  const all = Array.isArray(bulkItems) ? [...bulkItems] : [];
  let page = Math.floor(all.length / pageSize) + 1 || 1;

  while (page <= maxPages) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...extra,
    });
    const res = await apiGetFn(`/api/v1/employee/${employeeId}/leads?${params.toString()}`, {
      headers,
      skipCache: true,
      cacheTtl: 0,
    });
    const items = unwrapApiData(res);
    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);

    const total = Number(res?.total);
    if (Number.isFinite(total) && all.length >= total) break;
    if (items.length < pageSize) break;
    page += 1;
  }

  return all;
}

export function apiLeadToPipeline(lead) {
  const stageRaw = lead.pipelineStage || lead.pipeline_stage || lead.status || "Lead";
  const stage = mapStageToId(stageRaw, lead.status);
  const temp = String(lead.temperature || "").toLowerCase();
  const priority = temp.includes("hot") ? "HOT" : temp.includes("cold") ? "COLD" : "WARM";
  const assignedTo = lead.assignedTo;
  const owner = (typeof assignedTo === "object" && assignedTo?.name)
    || lead.assigneeName
    || lead.assignee_name
    || lead.employeeName
    || "";

  return {
    id: lead.id,
    _dbId: lead.id,
    stage,
    name: lead.leadName || lead.lead_name || "Lead",
    company: lead.companyName || lead.company_name || "—",
    value: Number(lead.expectedRevenue ?? lead.expected_revenue ?? 0),
    priority,
    status: lead.status || lead.employeeStatus || "",
    updatedAt: lead.updatedAt || lead.updated_at || lead.createdAt || new Date().toISOString(),
    phone: lead.phone || "",
    email: lead.email || "",
    city: lead.city || "",
    source: lead.source || "Website",
    owner,
    assignee: owner,
    employeeName: owner,
    winProbability: lead.winProbability ?? lead.win_probability ?? 50,
    activities: [],
    tasks: [],
  };
}

const DETAIL_AVATAR_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#7c3aed", "#dc2626", "#0ea5e9", "#64748b"];

/** Normalize admin, pipeline, or employee lead shapes for the shared detail drawer. */
export function normalizeLeadForDetailPanel(lead) {
  if (!lead) return null;

  const name = lead.name || lead.lead_name || "Lead";
  const av = lead.av || name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const color = lead.color || DETAIL_AVATAR_COLORS[Number(lead.id) % DETAIL_AVATAR_COLORS.length];
  const revenue = Number(
    lead.expectedRevenue ?? lead.expected_revenue ?? lead.value ?? parseEmpBudget(lead.budget) ?? 0,
  );
  const stageRaw = lead.pipelineStage || lead.pipeline_stage || lead.stage || "Lead";
  const stageLabel = normalizeStageLabel(stageRaw, lead.status);
  const assignee = lead.assignee
    || lead.owner
    || lead.assignee_name
    || lead.employeeName
    || (typeof lead.assignedTo === "object" ? lead.assignedTo?.name : "")
    || "—";

  const temp = String(lead.temperature || "").toLowerCase();
  let status = lead.status || "warm";
  if (!["hot", "warm", "cold"].includes(status)) {
    if (temp.includes("hot")) status = "hot";
    else if (temp.includes("cold")) status = "cold";
    else if (temp.includes("warm")) status = "warm";
  }

  return {
    id: lead.id,
    name,
    company: lead.company || lead.company_name || "—",
    phone: lead.phone || "",
    email: lead.email || "",
    stage: stageLabel,
    pipelineStage: stageLabel,
    source: lead.source || "—",
    budget: revenue > 0 ? formatEmpPipelineValue(revenue) : (lead.budget || "—"),
    expectedRevenue: revenue,
    service: lead.service || lead.requirements || "—",
    city: lead.city || "",
    last: lead.last || formatRelativeTime(lead.updatedAt || lead.updated_at || lead.createdAt || lead.created_at),
    assignee,
    assigneeId: lead.assigneeId ?? lead.assigned_to ?? lead.assignedTo?.id ?? null,
    status,
    av,
    color,
    temperature: lead.temperature,
  };
}

export function buildDetailDraft(lead) {
  if (!lead) return {};
  return {
    phone: lead.phone || "",
    email: lead.email || "",
    stage: lead.stage || lead.pipelineStage || "Lead",
    source: lead.source || "",
    city: lead.city || "",
    service: lead.service || "",
    company: lead.company || "",
    expectedRevenue: String(lead.expectedRevenue || parseEmpBudget(lead.budget) || ""),
  };
}
