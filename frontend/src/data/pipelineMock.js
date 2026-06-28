const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

export const PIPELINE_STAGES = [
  { id: "new", label: "New", badgeTone: "info" },
  { id: "contacted", label: "Contacted", badgeTone: "primary" },
  { id: "qualified", label: "Qualified", badgeTone: "success" },
  { id: "proposal", label: "Proposal", badgeTone: "warning" },
  { id: "negotiation", label: "Negotiation", badgeTone: "purple" },
  { id: "closed_won", label: "Closed Won", badgeTone: "success" },
];

export const PRIORITY_BADGE = {
  HOT: "danger",
  WARM: "warning",
  COLD: "info",
};

export const PRIORITY_OPTIONS = ["HOT", "WARM", "COLD"];

function lead(id, stage, name, company, value, priority, updatedHours, extra = {}) {
  return {
    id,
    stage,
    name,
    company,
    value,
    priority,
    updatedAt: hoursAgo(updatedHours),
    phone: extra.phone || "+919876543210",
    email: extra.email || `${name.split(" ")[0].toLowerCase()}@${company.split(" ")[0].toLowerCase()}.in`,
    city: extra.city || "Mumbai",
    source: extra.source || "Website",
    owner: extra.owner || "Priya Sharma",
    winProbability: extra.winProbability ?? 50,
    nextFollowUp: extra.nextFollowUp || "2026-06-22",
    notes: extra.notes || "",
    activities: extra.activities || [],
    tasks: extra.tasks || [],
  };
}

export const PIPELINE_LEADS = [
  lead("p1", "new", "Ananya Sharma", "Penguin India", 478000, "HOT", 31, {
    city: "Delhi",
    source: "Meta Ads",
    winProbability: 42,
    activities: [
      { id: 1, type: "created", text: "Lead captured from Meta Lead Form", at: daysAgo(2) },
      { id: 2, type: "note", text: "Requested catalog pricing for Q3", at: hoursAgo(31) },
    ],
    tasks: [
      { id: 1, text: "Send intro deck", done: false },
      { id: 2, text: "Qualify budget timeline", done: false },
    ],
  }),
  lead("p2", "new", "Rohan Mehta", "Mehta Textiles", 215000, "WARM", 18, {
    source: "Google Ads",
    activities: [{ id: 1, type: "created", text: "Inbound from Google Ads campaign", at: hoursAgo(18) }],
    tasks: [{ id: 1, text: "First outreach call", done: false }],
  }),
  lead("p3", "new", "Kavya Nair", "Nair Foods", 89000, "COLD", 52, {
    source: "Website",
    activities: [{ id: 1, type: "created", text: "Website form submission", at: hoursAgo(52) }],
    tasks: [],
  }),
  lead("p4", "new", "Arjun Patel", "Patel Logistics", 156000, "WARM", 8, {
    source: "Referral",
    activities: [{ id: 1, type: "created", text: "Referred by existing client", at: hoursAgo(8) }],
    tasks: [{ id: 1, text: "Verify referral contact", done: true }],
  }),
  lead("p5", "new", "Isha Dutta", "Dutta Media", 124000, "COLD", 26, {
    source: "WhatsApp",
    activities: [{ id: 1, type: "created", text: "WhatsApp inquiry received", at: hoursAgo(26) }],
    tasks: [],
  }),

  lead("p6", "contacted", "Meera Joshi", "Joshi Retail", 175000, "HOT", 14, {
    activities: [
      { id: 1, type: "call", text: "Discovery call completed — 22 min", at: hoursAgo(14) },
      { id: 2, type: "email", text: "Follow-up email sent with case study", at: hoursAgo(20) },
    ],
    tasks: [
      { id: 1, text: "Schedule demo", done: false },
      { id: 2, text: "Share ROI calculator", done: true },
    ],
  }),
  lead("p7", "contacted", "Harish Bhatt", "Bhatt Manufacturing", 310000, "WARM", 22, {
    activities: [{ id: 1, type: "call", text: "Left voicemail, awaiting callback", at: hoursAgo(22) }],
    tasks: [{ id: 1, text: "Retry call tomorrow", done: false }],
  }),
  lead("p8", "contacted", "Divya Menon", "Menon Foods", 145000, "WARM", 6, {
    activities: [{ id: 1, type: "meeting", text: "Intro meeting held with ops head", at: hoursAgo(6) }],
    tasks: [{ id: 1, text: "Send meeting recap", done: false }],
  }),
  lead("p9", "contacted", "Tanvi Shah", "Shah Jewellers", 195000, "WARM", 40, {
    activities: [{ id: 1, type: "email", text: "Pricing sheet shared", at: hoursAgo(40) }],
    tasks: [],
  }),
  lead("p10", "contacted", "Vikram Singh", "Singh Auto", 88000, "COLD", 72, {
    activities: [{ id: 1, type: "call", text: "No answer — 2 attempts", at: hoursAgo(72) }],
    tasks: [{ id: 1, text: "Try alternate number", done: false }],
  }),

  lead("p11", "qualified", "Sneha Iyer", "Iyer Tech Solutions", 280000, "WARM", 12, {
    winProbability: 55,
    activities: [
      { id: 1, type: "meeting", text: "Technical qualification completed", at: hoursAgo(12) },
      { id: 2, type: "note", text: "Budget confirmed for Q3 rollout", at: hoursAgo(24) },
    ],
    tasks: [
      { id: 1, text: "Prepare custom scope", done: false },
      { id: 2, text: "Loop in solutions engineer", done: true },
    ],
  }),
  lead("p12", "qualified", "Isha Banerjee", "Banerjee Media", 340000, "HOT", 9, {
    winProbability: 58,
    activities: [{ id: 1, type: "call", text: "Decision maker identified — CMO", at: hoursAgo(9) }],
    tasks: [{ id: 1, text: "Draft proposal outline", done: false }],
  }),
  lead("p13", "qualified", "Neha Kapoor", "Kapoor Studios", 210000, "WARM", 28, {
    activities: [{ id: 1, type: "email", text: "Sent qualification questionnaire", at: hoursAgo(28) }],
    tasks: [{ id: 1, text: "Review questionnaire responses", done: false }],
  }),
  lead("p14", "qualified", "Sanjay Rao", "Rao Constructions", 85000, "COLD", 48, {
    activities: [{ id: 1, type: "note", text: "Needs board approval — slow cycle", at: hoursAgo(48) }],
    tasks: [],
  }),

  lead("p15", "proposal", "Deepak Malhotra", "Malhotra Finance", 520000, "HOT", 5, {
    winProbability: 61,
    activities: [
      { id: 1, type: "email", text: "Proposal v2 sent — annual retainer", at: hoursAgo(5) },
      { id: 2, type: "call", text: "Walkthrough call scheduled Friday", at: hoursAgo(16) },
    ],
    tasks: [
      { id: 1, text: "Proposal walkthrough prep", done: false },
      { id: 2, text: "Legal review checklist", done: false },
    ],
  }),
  lead("p16", "proposal", "Vivek Choudhary", "Choudhary Pharma", 750000, "HOT", 11, {
    activities: [{ id: 1, type: "email", text: "Enterprise proposal delivered", at: hoursAgo(11) }],
    tasks: [{ id: 1, text: "Follow up on open questions", done: false }],
  }),
  lead("p17", "proposal", "Lakshmi Venkat", "Venkat Exports", 120000, "COLD", 36, {
    activities: [{ id: 1, type: "email", text: "Standard proposal sent", at: hoursAgo(36) }],
    tasks: [],
  }),
  lead("p18", "proposal", "Rahul Verma", "Verma Digital", 265000, "WARM", 19, {
    activities: [{ id: 1, type: "meeting", text: "Proposal review meeting done", at: hoursAgo(19) }],
    tasks: [{ id: 1, text: "Revise pricing tier", done: false }],
  }),

  lead("p19", "negotiation", "Amit Desai", "Desai Logistics", 450000, "HOT", 4, {
    winProbability: 72,
    activities: [
      { id: 1, type: "call", text: "Negotiated 8% discount on year-1", at: hoursAgo(4) },
      { id: 2, type: "note", text: "Legal reviewing MSA redlines", at: hoursAgo(10) },
    ],
    tasks: [
      { id: 1, text: "Finalize contract terms", done: false },
      { id: 2, text: "Get finance sign-off", done: false },
    ],
  }),
  lead("p20", "negotiation", "Rohit Saxena", "Saxena Auto", 890000, "HOT", 7, {
    winProbability: 78,
    activities: [{ id: 1, type: "meeting", text: "Commercial terms discussion", at: hoursAgo(7) }],
    tasks: [{ id: 1, text: "Send revised SOW", done: false }],
  }),
  lead("p21", "negotiation", "Karan Gill", "Gill Sports", 395000, "WARM", 15, {
    activities: [{ id: 1, type: "email", text: "Counter-offer received", at: hoursAgo(15) }],
    tasks: [{ id: 1, text: "Prepare counter proposal", done: false }],
  }),

  lead("p22", "closed_won", "Manish Tiwari", "Tiwari Infra", 420000, "HOT", 120, {
    winProbability: 100,
    activities: [
      { id: 1, type: "won", text: "Deal closed — contract signed", at: daysAgo(5) },
      { id: 2, type: "note", text: "Kickoff scheduled for next week", at: daysAgo(4) },
    ],
    tasks: [{ id: 1, text: "Hand off to onboarding", done: true }],
  }),
  lead("p23", "closed_won", "Pooja Agarwal", "Agarwal Healthcare", 680000, "HOT", 336, {
    winProbability: 100,
    activities: [{ id: 1, type: "won", text: "Closed won — enterprise package", at: daysAgo(14) }],
    tasks: [],
  }),
  lead("p24", "closed_won", "Sarah Chen", "Chen Analytics", 550000, "WARM", 480, {
    winProbability: 100,
    activities: [{ id: 1, type: "won", text: "Annual subscription signed", at: daysAgo(20) }],
    tasks: [{ id: 1, text: "Send welcome kit", done: true }],
  }),
];

export function formatPipelineValue(amount) {
  if (amount >= 100000) return `₹${Math.round(amount / 1000)}K`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function timeAgoShort(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export function getStageMeta(stageId) {
  return PIPELINE_STAGES.find((s) => s.id === stageId) || PIPELINE_STAGES[0];
}

export function getStageIndex(stageId) {
  return PIPELINE_STAGES.findIndex((s) => s.id === stageId);
}

export function patchLead(lead, patch, activityText, activityType = "note") {
  const next = { ...lead, ...patch, updatedAt: new Date().toISOString() };
  if (patch.stage === "closed_won") next.winProbability = 100;
  if (activityText) {
    next.activities = [
      { id: Date.now(), type: activityType, text: activityText, at: new Date().toISOString() },
      ...lead.activities,
    ];
  }
  return next;
}

export function groupLeadsByStage(leads) {
  const map = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, []]));
  leads.forEach((l) => {
    if (map[l.stage]) map[l.stage].push(l);
  });
  return map;
}

const FORM_STAGE_TO_PIPELINE = {
  "New Lead": "new",
  Contacted: "contacted",
  Qualified: "qualified",
  "Proposal Sent": "proposal",
  Negotiation: "negotiation",
  Converted: "closed_won",
};

const FORM_TEMP_TO_PRIORITY = {
  "Hot Lead": "HOT",
  "Warm Lead": "WARM",
  "Cold Lead": "COLD",
};

export function leadFromForm(raw) {
  const stage = FORM_STAGE_TO_PIPELINE[raw.pipeline_stage] || "new";
  const priority = FORM_TEMP_TO_PRIORITY[raw.temperature] || "WARM";
  const assigneeName =
    raw.assignee_name ||
    raw.assigneeName ||
    raw.assignee ||
    (typeof raw.assignedTo === "object" ? raw.assignedTo?.name : "") ||
    raw.owner ||
    "";
  return {
    id: String(raw.id ?? raw._id ?? `p-${Date.now()}`),
    stage,
    name: raw.lead_name || raw.name || "New Lead",
    company: raw.company_name || raw.company || "",
    value: Number(raw.expected_revenue ?? raw.value ?? 0),
    priority,
    updatedAt: new Date().toISOString(),
    phone: raw.phone || "",
    email: raw.email || "",
    city: raw.city || "",
    state: raw.state || "",
    source: raw.source || "Manual",
    owner: assigneeName,
    assignee: assigneeName,
    assignee_name: assigneeName,
    employeeName: assigneeName,
    assigneeId: raw.assigneeId || raw.assigned_to || raw.assignedTo?.id || null,
    assignedTo: raw.assignedTo || (assigneeName ? { id: raw.assigneeId, name: assigneeName } : null),
    winProbability: raw.win_probability ?? 50,
    nextFollowUp: raw.next_followup_date || raw.nextFollowUp || "",
    notes: raw.notes || "",
    activities: [
      { id: Date.now(), type: "created", text: "Lead added manually", at: new Date().toISOString() },
    ],
    tasks: [],
  };
}

export function getPipelineSummary(leads) {
  const total = leads.length;
  const hot = leads.filter((l) => l.priority === "HOT").length;
  const value = leads.reduce((s, l) => s + l.value, 0);
  const active = leads.filter((l) => l.stage !== "closed_won").length;
  const won = leads.filter((l) => l.stage === "closed_won").length;
  const winRate = total ? Math.round((won / total) * 100) : 0;
  return { total, hot, value, active, winRate };
}
