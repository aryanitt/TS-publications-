export const FORM_SOURCES = [
  { id: "all", label: "All Sources" },
  { id: "google_ads", label: "Google Ads" },
  { id: "instagram", label: "Instagram" },
  { id: "website", label: "Website" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "whatsapp", label: "WhatsApp" },
];

export const FORM_STATUSES = [
  { id: "all", label: "All Statuses" },
  { id: "ACTIVE", label: "Active" },
  { id: "PAUSED", label: "Paused" },
  { id: "DRAFT", label: "Draft" },
];

export const FORM_SERVICES = [
  { id: "all", label: "All Services" },
  { id: "AI Automation", label: "AI Automation" },
  { id: "CRM Setup", label: "CRM Setup" },
  { id: "Lead Gen", label: "Lead Gen" },
  { id: "Consulting", label: "Consulting" },
];

export const DEFAULT_FORM_FIELDS = [
  { id: "f1", label: "Full Name", type: "INPUT", required: true },
  { id: "f2", label: "Email Address", type: "EMAIL", required: true },
  { id: "f3", label: "Interested Service", type: "DROPDOWN", required: true, options: ["AI Automation", "CRM Setup", "Lead Gen", "Consulting"] },
  { id: "f4", label: "Phone Number", type: "PHONE", required: false },
  { id: "f5", label: "Message / Notes", type: "TEXTAREA", required: false },
];

export const FORMS = [
  {
    id: "google-ads",
    name: "Google Ads Form",
    source: "Google Ads",
    sourceKey: "google_ads",
    status: "ACTIVE",
    leads: 1284,
    revenue: 425000,
    conversion: 18,
    service: "AI Automation",
    fields: DEFAULT_FORM_FIELDS,
  },
  {
    id: "instagram-leads",
    name: "Instagram Leads",
    source: "Instagram",
    sourceKey: "instagram",
    status: "ACTIVE",
    leads: 842,
    revenue: 218000,
    conversion: 14,
    service: "Lead Gen",
    fields: DEFAULT_FORM_FIELDS,
  },
  {
    id: "website-contact",
    name: "Website Contact",
    source: "Website",
    sourceKey: "website",
    status: "PAUSED",
    leads: 456,
    revenue: 98000,
    conversion: 11,
    service: "CRM Setup",
    fields: DEFAULT_FORM_FIELDS.slice(0, 4),
  },
  {
    id: "linkedin-b2b",
    name: "LinkedIn B2B",
    source: "LinkedIn",
    sourceKey: "linkedin",
    status: "ACTIVE",
    leads: 312,
    revenue: 156000,
    conversion: 22,
    service: "Consulting",
    fields: DEFAULT_FORM_FIELDS,
  },
  {
    id: "whatsapp-inbound",
    name: "WhatsApp Inbound",
    source: "WhatsApp",
    sourceKey: "whatsapp",
    status: "DRAFT",
    leads: 0,
    revenue: 0,
    conversion: 0,
    service: "Lead Gen",
    fields: DEFAULT_FORM_FIELDS.slice(0, 3),
  },
  {
    id: "meta-retarget",
    name: "Meta Retarget Form",
    source: "Google Ads",
    sourceKey: "google_ads",
    status: "ACTIVE",
    leads: 967,
    revenue: 312000,
    conversion: 16,
    service: "AI Automation",
    fields: DEFAULT_FORM_FIELDS,
  },
];

export const FORM_LEADS = {
  "google-ads": [
    { id: 1, name: "Rahul Sharma", email: "rahul@techcorp.in", service: "AI Automation", budget: 85000, status: "NEW", agent: "Sarah Chen", revenue: 85000, created: "2026-06-18" },
    { id: 2, name: "Priya Mehta", email: "priya.m@startup.io", service: "CRM Setup", budget: 42000, status: "QUALIFIED", agent: "James Wilson", revenue: 42000, created: "2026-06-17" },
    { id: 3, name: "Amit Patel", email: "amit@enterprise.com", service: "AI Automation", budget: 120000, status: "CONTACTED", agent: "Emily Davis", revenue: 120000, created: "2026-06-17" },
    { id: 4, name: "Neha Gupta", email: "neha@scaleup.co", service: "Lead Gen", budget: 35000, status: "NEW", agent: "Unassigned", revenue: 35000, created: "2026-06-16" },
    { id: 5, name: "Vikram Singh", email: "vikram@corp.in", service: "Consulting", budget: 95000, status: "QUALIFIED", agent: "Suresh Kumar", revenue: 95000, created: "2026-06-16" },
    { id: 6, name: "Anita Desai", email: "anita@brand.com", service: "AI Automation", budget: 68000, status: "CONVERTED", agent: "Sarah Chen", revenue: 68000, created: "2026-06-15" },
    { id: 7, name: "Karan Malhotra", email: "karan@saas.io", service: "CRM Setup", budget: 52000, status: "CONTACTED", agent: "James Wilson", revenue: 52000, created: "2026-06-15" },
    { id: 8, name: "Sneha Reddy", email: "sneha@fintech.in", service: "Lead Gen", budget: 28000, status: "NEW", agent: "Unassigned", revenue: 28000, created: "2026-06-14" },
    { id: 9, name: "Arjun Nair", email: "arjun@cloud.com", service: "AI Automation", budget: 110000, status: "QUALIFIED", agent: "Emily Davis", revenue: 110000, created: "2026-06-14" },
    { id: 10, name: "Divya Iyer", email: "divya@agency.co", service: "Consulting", budget: 74000, status: "HOT", agent: "Suresh Kumar", revenue: 74000, created: "2026-06-13" },
  ],
};

export function formatFormRevenue(val) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

export function getFormById(id) {
  return FORMS.find((f) => f.id === id) || null;
}

export function getFormLeads(formId) {
  return FORM_LEADS[formId] || FORM_LEADS["google-ads"] || [];
}

export function getFormsSummary(forms = FORMS) {
  const active = forms.filter((f) => f.status === "ACTIVE").length;
  const totalLeads = forms.reduce((s, f) => s + f.leads, 0);
  const topSource = [...forms].sort((a, b) => b.leads - a.leads)[0]?.source || "—";
  return {
    totalForms: forms.length,
    totalLeads,
    activeForms: active,
    topSource,
  };
}
