import { formatEmpPipelineValue } from "../data/employeeMock.js";

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
    notpick: "Cold Lead",
    converted: "Hot Lead",
    ni: "Cold Lead",
  };
  return map[status] || "Warm Lead";
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

/** Replace list on fetch — used for per-employee workspace (no cross-user merge). */
export function replaceFetchedList(_prev, next) {
  if (!Array.isArray(next)) return [];
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
  if (s === "new lead" || s === "new") return "new";
  if (s.includes("not pick")) return "notpick";
  if (s.includes("attempted")) return "attempted";
  if (s.includes("contacted") || s.includes("qualified")) return "contacted";
  if (s.includes("booked") || s.includes("call booked")) return "booked";
  if (s.includes("proposal")) return "proposal";
  if (s.includes("negotiation")) return "negotiation";
  if (s.includes("converted") || s === "won") return "converted";
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
  if (raw === "converted") return "converted";
  if (raw === "ni" || raw.includes("not interested")) return "ni";
  if (raw === "new") return "new";
  if (WORKFLOW_STATUS.has(raw)) return raw;
  return normalizeTemperature(lead.temperature || lead.status);
}

export function apiLeadToEmployee(lead, avatarColors = AVATAR_COLORS) {
  const name = lead.leadName || lead.lead_name || "Lead";
  const id = lead.id;
  const av = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const status = normalizeEmployeeLeadStatus(lead);
  const stage = lead.pipelineStage || lead.pipeline_stage || lead.status || "Attempted";
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
    pipeline_stage: lead.pipelineStage || lead.pipeline_stage,
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
  const STAGE_STATUS = {
    "New Lead": "new",
    "Not Pick": "notpick",
    "Attempted": "attempted",
    "Contacted": "contacted",
    "Booked": "booked",
    "Proposal": "proposal",
    "Negotiation": "negotiation",
    "Converted": "converted",
    "Closed": "ni",
  };
  const employeeStatus = STAGE_STATUS[stageLabel] || currentStatus;
  return {
    stage: stageLabel,
    pipelineStage: stageLabel,
    status: stageLabel,
    employeeStatus,
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

const PIPELINE_STAGE_MAP = [
  ["closed won", "closed_won"],
  ["converted", "closed_won"],
  ["won", "closed_won"],
  ["negotiation", "negotiation"],
  ["proposal", "proposal"],
  ["qualified", "qualified"],
  ["contacted", "contacted"],
  ["new", "new"],
];

export function apiLeadToPipeline(lead) {
  const stageRaw = String(
    lead.pipelineStage || lead.pipeline_stage || lead.status || "new",
  ).toLowerCase();
  let stage = "new";
  for (const [needle, id] of PIPELINE_STAGE_MAP) {
    if (stageRaw.includes(needle)) {
      stage = id;
      break;
    }
  }
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
