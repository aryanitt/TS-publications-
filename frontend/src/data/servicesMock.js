import { formatINR, formatServicePriceLabel } from "../lib/indianFormat.js";

export const SERVICE_CATEGORIES = [
  { id: "all", label: "Category: All" },
  { id: "ai", label: "AI Solutions" },
  { id: "crm", label: "CRM & Ops" },
  { id: "leadgen", label: "Lead Gen" },
  { id: "consulting", label: "Consulting" },
  { id: "dev", label: "Custom Dev" },
];

export const SERVICE_STATUSES = [
  { id: "all", label: "Status: All" },
  { id: "ACTIVE", label: "Active" },
  { id: "PAUSED", label: "Paused" },
  { id: "DRAFT", label: "Draft" },
];

export const SERVICE_PRICING_SORT = [
  { id: "high", label: "Pricing: High to Low" },
  { id: "low", label: "Pricing: Low to High" },
];

export const LEAD_DISTRIBUTION = [
  { id: 1, name: "Sarah Chen", role: "Senior Sales Executive", leads: 342, avatar: "SC" },
  { id: 2, name: "James Wilson", role: "Key Account Manager", leads: 218, avatar: "JW" },
  { id: 3, name: "Emily Davis", role: "Sales Executive", leads: 186, avatar: "ED" },
  { id: 4, name: "Suresh Kumar", role: "Senior Sales Executive", leads: 164, avatar: "SK" },
  { id: 5, name: "Priya Mehta", role: "Growth Associate", leads: 92, avatar: "PM" },
  { id: 6, name: "Alex Rivera", role: "Business Development", leads: 78, avatar: "AR" },
  { id: 7, name: "Nina Patel", role: "Sales Executive", leads: 64, avatar: "NP" },
  { id: 8, name: "Marcus Lee", role: "Inside Sales", leads: 51, avatar: "ML" },
];

export const REVENUE_DISTRIBUTION = [
  { name: "AI Automation", value: 45, amount: 540000, color: "#be123c" },
  { name: "CRM Development", value: 25, amount: 300000, color: "#fda4af" },
  { name: "Custom Dev", value: 30, amount: 360000, color: "#881337" },
];

export const REVENUE_TOTAL = 1200000;

export const SALES_DISTRIBUTION = [
  { name: "Lead Gen Engine", sales: 920, color: "#be123c" },
  { name: "AI Automation Suite", sales: 842, color: "#881337" },
  { name: "CRM Setup & Onboarding", sales: 612, color: "#e11d48" },
  { name: "Custom Software Dev", sales: 248, color: "#fda4af" },
  { name: "Strategic Consulting", sales: 186, color: "#fecdd3" },
];

export const SALES_TOTAL = SALES_DISTRIBUTION.reduce((sum, item) => sum + item.sales, 0);

export const REVENUE_TRAJECTORY = [
  { period: "W1", label: "Jun 1–7", revenue: 5.2 },
  { period: "W2", label: "Jun 8–14", revenue: 4.0 },
  { period: "W3", label: "Jun 15–21", revenue: 7.5 },
  { period: "W4", label: "Jun 22–28", revenue: 5.8 },
  { period: "W5", label: "Jun 29–Jul 5", revenue: 11.0 },
  { period: "W6", label: "Jul 6–12", revenue: 3.6 },
  { period: "W7", label: "Jul 13–19", revenue: 18.4 },
];

export const SERVICES = [
  {
    id: "ai-automation",
    name: "AI Automation Suite",
    category: "ai",
    categoryLabel: "AI Solutions",
    status: "ACTIVE",
    badge: "POPULAR",
    description: "End-to-end workflow automation powered by custom LLM agents and CRM integrations.",
    tags: ["AI SOLUTIONS", "6-8 WEEKS"],
    revenue: 450000,
    clients: 128,
    leads: 12482,
    converted: 842,
    convRate: 6.8,
    price: "₹15,000/mo",
    priceNum: 15000,
    icon: "bot",
    features: [
      { title: "Hyper-Personalization", desc: "AI-driven outreach tailored to each lead profile." },
      { title: "Predictive Scoring", desc: "Rank leads by close probability in real time." },
      { title: "Auto Follow-ups", desc: "Smart sequences across email, SMS, and WhatsApp." },
      { title: "CRM Sync", desc: "Bi-directional sync with HubSpot, Zoho, and Salesforce." },
    ],
    tiers: [
      { name: "Basic", price: "₹499/mo", features: ["2 workflows", "Email automation", "Basic reporting"], popular: false },
      { name: "Professional", price: "₹1,249/mo", features: ["10 workflows", "Multi-channel", "AI scoring", "Priority support"], popular: true },
      { name: "Enterprise", price: "Custom", features: ["Unlimited workflows", "Custom LLM", "Dedicated CSM", "SLA guarantee"], popular: false },
    ],
    insights: [
      "Conversion rate is 12% above catalog average for enterprise inbound leads.",
      "Recommend promoting Professional tier — 68% of closed deals land here.",
    ],
    delivery: [
      { step: "Discovery & Audit", status: "done" },
      { step: "Workflow Design", status: "done" },
      { step: "Agent Training", status: "active" },
      { step: "Go-Live & Handoff", status: "pending" },
    ],
    team: [
      { name: "Sarah Chen", load: 94, avatar: "SC" },
      { name: "James Wilson", load: 60, avatar: "JW" },
      { name: "Emily Davis", load: 72, avatar: "ED" },
    ],
  },
  {
    id: "crm-setup",
    name: "CRM Setup & Onboarding",
    category: "crm",
    categoryLabel: "CRM & Ops",
    status: "ACTIVE",
    badge: "ACTIVE",
    description: "Full CRM implementation, data migration, pipeline design, and team training.",
    tags: ["CRM", "4-6 WEEKS"],
    revenue: 280000,
    clients: 96,
    leads: 8420,
    converted: 612,
    convRate: 7.3,
    price: "₹8,500/mo",
    priceNum: 8500,
    icon: "database",
    features: [
      { title: "Pipeline Design", desc: "Custom stages aligned to your sales motion." },
      { title: "Data Migration", desc: "Clean import from spreadsheets or legacy CRM." },
      { title: "Team Training", desc: "Role-based onboarding for reps and managers." },
      { title: "Automation Rules", desc: "Assignment, alerts, and SLA triggers." },
    ],
    tiers: [
      { name: "Starter", price: "₹2,500", features: ["1 pipeline", "Up to 5 users", "Email support"], popular: false },
      { name: "Growth", price: "₹5,500", features: ["3 pipelines", "Up to 20 users", "Migration included"], popular: true },
      { name: "Scale", price: "Custom", features: ["Unlimited pipelines", "Dedicated admin", "Custom fields"], popular: false },
    ],
    insights: ["Strong fit for mid-market teams migrating from spreadsheets."],
    delivery: [
      { step: "Requirements", status: "done" },
      { step: "Configuration", status: "active" },
      { step: "Training", status: "pending" },
      { step: "Launch", status: "pending" },
    ],
    team: [
      { name: "Suresh Kumar", load: 88, avatar: "SK" },
      { name: "Priya Mehta", load: 55, avatar: "PM" },
    ],
  },
  {
    id: "lead-gen",
    name: "Lead Generation Engine",
    category: "leadgen",
    categoryLabel: "Lead Gen",
    status: "ACTIVE",
    badge: "ACTIVE",
    description: "Multi-channel outbound and inbound lead capture with qualification workflows.",
    tags: ["OUTBOUND", "3-5 WEEKS"],
    revenue: 195000,
    clients: 74,
    leads: 15600,
    converted: 920,
    convRate: 5.9,
    price: "₹6,200/mo",
    priceNum: 6200,
    icon: "target",
    features: [
      { title: "ICP Targeting", desc: "Build lists from firmographic and intent signals." },
      { title: "Multi-Channel", desc: "Email, LinkedIn, and cold-call playbooks." },
      { title: "Qualification", desc: "BANT-style scoring before handoff to sales." },
      { title: "Reporting", desc: "Weekly pipeline and ROI dashboards." },
    ],
    tiers: [
      { name: "Launch", price: "₹3,200/mo", features: ["500 leads/mo", "Email only"], popular: false },
      { name: "Scale", price: "₹6,200/mo", features: ["2,000 leads/mo", "Multi-channel"], popular: true },
      { name: "Enterprise", price: "Custom", features: ["Unlimited volume", "Dedicated SDR pod"], popular: false },
    ],
    insights: ["Highest lead volume in catalog — optimize qualification to protect rep time."],
    delivery: [
      { step: "ICP Workshop", status: "done" },
      { step: "List Build", status: "done" },
      { step: "Campaign Launch", status: "active" },
      { step: "Optimization", status: "pending" },
    ],
    team: [{ name: "Emily Davis", load: 81, avatar: "ED" }],
  },
  {
    id: "consulting",
    name: "Strategic Consulting",
    category: "consulting",
    categoryLabel: "Consulting",
    status: "ACTIVE",
    badge: "ENTERPRISE",
    description: "Revenue operations advisory, GTM strategy, and executive workshops for scaling teams.",
    tags: ["ADVISORY", "RETAINER"],
    revenue: 165000,
    clients: 42,
    leads: 3200,
    converted: 186,
    convRate: 5.8,
    price: "₹12,000/mo",
    priceNum: 12000,
    icon: "briefcase",
    features: [
      { title: "GTM Audit", desc: "Full funnel diagnosis and benchmark report." },
      { title: "RevOps Design", desc: "Process, tooling, and KPI framework." },
      { title: "Executive Workshops", desc: "Quarterly strategy sessions with leadership." },
      { title: "Playbook Library", desc: "Documented SOPs and sales enablement assets." },
    ],
    tiers: [
      { name: "Advisory", price: "₹5,000/mo", features: ["2 sessions/mo", "Async support"], popular: false },
      { name: "Partner", price: "₹12,000/mo", features: ["Weekly sessions", "RevOps support"], popular: true },
      { name: "Embedded", price: "Custom", features: ["Fractional CRO", "Full team embed"], popular: false },
    ],
    insights: ["Longest sales cycle — nurture enterprise accounts with case studies."],
    delivery: [
      { step: "Discovery", status: "done" },
      { step: "Strategy Deck", status: "active" },
      { step: "Implementation", status: "pending" },
    ],
    team: [{ name: "James Wilson", load: 45, avatar: "JW" }],
  },
  {
    id: "custom-dev",
    name: "Custom Software Dev",
    category: "dev",
    categoryLabel: "Custom Dev",
    status: "ACTIVE",
    badge: "ACTIVE",
    description: "Bespoke dashboards, integrations, and internal tools built for your stack.",
    tags: ["ENGINEERING", "8-12 WEEKS"],
    revenue: 110000,
    clients: 38,
    leads: 4100,
    converted: 248,
    convRate: 6.0,
    price: "₹18,000/mo",
    priceNum: 18000,
    icon: "code",
    features: [
      { title: "Custom Dashboards", desc: "Admin panels and client portals on your brand." },
      { title: "API Integrations", desc: "Connect CRM, billing, and support tools." },
      { title: "Automation Scripts", desc: "Scheduled jobs and webhook handlers." },
      { title: "Maintenance", desc: "Ongoing fixes, updates, and monitoring." },
    ],
    tiers: [
      { name: "Sprint", price: "₹8,000", features: ["2-week sprint", "1 developer"], popular: false },
      { name: "Team", price: "₹18,000/mo", features: ["Dedicated pod", "Bi-weekly demos"], popular: true },
      { name: "Retainer", price: "Custom", features: ["SLA", "24/7 support"], popular: false },
    ],
    insights: ["Bundle with AI Automation for 22% higher average contract value."],
    delivery: [
      { step: "Scoping", status: "done" },
      { step: "Development", status: "active" },
      { step: "QA & Deploy", status: "pending" },
    ],
    team: [{ name: "Priya Mehta", load: 67, avatar: "PM" }],
  },
];

export function getServiceById(id) {
  const base = [...extraServices, ...SERVICES].find((s) => s.id === id);
  if (!base) return null;
  const patch = catalogOverrides[id];
  return cloneService(patch ? { ...base, ...patch } : base);
}

let extraServices = [];

export function registerService(service) {
  extraServices = [service, ...extraServices.filter((s) => s.id !== service.id)];
}

const catalogOverrides = {};

function cloneService(service) {
  if (!service) return null;
  return {
    ...service,
    tags: [...(service.tags || [])],
    tiers: (service.tiers || []).map((t) => ({ ...t, features: [...(t.features || [])] })),
    features: (service.features || []).map((f) => ({ ...f })),
    team: (service.team || []).map((m) => ({ ...m })),
    insights: [...(service.insights || [])],
    delivery: (service.delivery || []).map((d) => ({ ...d })),
    documents: service.documents || ["Standard Proposal v4", "SOW Template v2", "Onboarding Checklist"],
    routingRule: service.routingRule || "Round Robin (Sales Team)",
    insightThreshold: service.insightThreshold ?? 85,
    publicVisible: service.publicVisible ?? true,
    clientPortal: service.clientPortal ?? false,
  };
}

export function updateService(service) {
  const next = cloneService(service);
  catalogOverrides[service.id] = next;
  const idx = extraServices.findIndex((s) => s.id === service.id);
  if (idx >= 0) extraServices[idx] = next;
  return next;
}

export function getAllServices() {
  return [...extraServices, ...SERVICES].map((s) => {
    const patch = catalogOverrides[s.id];
    return patch ? cloneService({ ...s, ...patch }) : cloneService(s);
  });
}

export function formatServiceMoney(val) {
  return formatINR(val);
}

export { formatServicePriceLabel };

export function serviceBadgeTone(badge) {
  if (badge === "POPULAR") return "danger";
  if (badge === "ENTERPRISE") return "purple";
  return "success";
}
