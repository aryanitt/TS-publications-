import { normalizeSource } from "./leadAssignment.js";

/** Known marketing / intake sources shown first on the dashboard. */
export const SOURCE_CATALOG = [
  { key: "meta_ads", label: "Meta" },
  { key: "google_ads", label: "Google Ads" },
  { key: "website", label: "Website" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "referral", label: "Referral" },
  { key: "landing_page", label: "Landing Page" },
  { key: "campaign", label: "Campaign" },
  { key: "manual", label: "Manual" },
  { key: "n8n", label: "n8n / Webhook" },
  { key: "api", label: "API" },
  { key: "form", label: "Form" },
  { key: "other", label: "Other" },
];

const CATALOG_LABELS = Object.fromEntries(SOURCE_CATALOG.map((s) => [s.key, s.label]));

function dig(obj, ...keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const key of keys) {
    const val = obj[key];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return null;
}

/** Sources that are internal integrations — not marketing channels. */
export const EXCLUDED_SOURCE_KEYS = new Set([
  "callyzer",
  "third_party",
]);

/** Valid marketing source keys for the Source dashboard. */
export const MARKETING_SOURCE_KEYS = new Set(SOURCE_CATALOG.map((s) => s.key));

function isSeedOrDemoLead(lead) {
  const assignedBy = String(lead?.assigned_by || lead?.assignedBy || "").toLowerCase();
  if (assignedBy === "seed") return true;

  const email = String(lead?.email || "").toLowerCase();
  if (email.endsWith("@example.com")) return true;

  const phone = String(lead?.phone || "").replace(/\D/g, "");
  if (phone.startsWith("9190000")) return true;

  return false;
}

/** Keep only real marketing-channel leads on the Source dashboard. */
export function isSourceDashboardLead(lead) {
  if (!lead || isSeedOrDemoLead(lead)) return false;

  const rawSource = String(lead.source || lead.sourceMeta?.integration || "").toLowerCase();
  if (rawSource.includes("callyzer")) return false;

  const key = resolveLeadSourceKey(lead);
  if (EXCLUDED_SOURCE_KEYS.has(key)) return false;
  if (!MARKETING_SOURCE_KEYS.has(key)) return false;

  // Legacy manual rows without channel attribution are not marketing sources.
  if (key === "manual") {
    const meta = lead.sourceMeta || lead.source_meta || {};
    if (!meta.channel) return false;
  }

  return true;
}

export function filterLeadsForSourceDashboard(leads = []) {
  return (Array.isArray(leads) ? leads : []).filter(isSourceDashboardLead);
}

/**
 * Resolve the display/grouping source for a lead (Meta, Google, Website, etc.).
 * n8n webhooks keep source=n8n in DB but channel lives in sourceMeta / payload.
 */
export function resolveLeadSourceKey(lead) {
  if (!lead) return "other";

  const meta = lead.sourceMeta || lead.source_meta || {};
  const raw = meta.rawPayload || meta.raw_payload || meta;

  const candidates = [
    meta.channel,
    meta.platform,
    meta.utm_source,
    meta.source,
    dig(raw, "channel", "platform", "utm_source", "source", "lead_source"),
    lead.source,
    lead.form_name,
    lead.formName,
    lead.keyword,
  ].filter(Boolean);

  for (const value of candidates) {
    const key = normalizeSource(value);
    if (key === "n8n") continue;
    if (key) return key;
  }

  const dbSource = normalizeSource(lead.source);
  if (dbSource && dbSource !== "n8n") return dbSource;
  return "n8n";
}

export function getSourceLabel(key) {
  return CATALOG_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function leadRevenue(lead) {
  return Number(lead?.expectedRevenue ?? lead?.expected_revenue ?? lead?.revenue ?? 0) || 0;
}

export function isLeadConverted(lead) {
  const stage = String(lead?.pipelineStage || lead?.pipeline_stage || lead?.status || "").toLowerCase();
  const temp = String(lead?.temperature || "").toLowerCase();
  return (
    stage.includes("converted")
    || stage.includes("won")
    || stage.includes("payment complete")
    || temp === "converted"
    || String(lead?.status || "").toLowerCase() === "converted"
  );
}

export function aggregateLeadsBySource(leads = []) {
  const buckets = new Map();

  for (const lead of leads) {
    const key = resolveLeadSourceKey(lead);
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: getSourceLabel(key),
        leads: [],
        leadCount: 0,
        totalRevenue: 0,
        convertedCount: 0,
      });
    }
    const bucket = buckets.get(key);
    const revenue = leadRevenue(lead);
    bucket.leads.push(lead);
    bucket.leadCount += 1;
    bucket.totalRevenue += revenue;
    if (isLeadConverted(lead)) bucket.convertedCount += 1;
  }

  return Array.from(buckets.values())
    .map((b) => ({
      ...b,
      conversion: b.leadCount ? Math.round((b.convertedCount / b.leadCount) * 100) : 0,
    }))
    .sort((a, b) => b.leadCount - a.leadCount || b.totalRevenue - a.totalRevenue);
}

export function getSourcesSummary(sourceGroups = []) {
  const totalLeads = sourceGroups.reduce((s, g) => s + g.leadCount, 0);
  const totalEarnings = sourceGroups.reduce((s, g) => s + g.totalRevenue, 0);
  const top = sourceGroups[0];
  return {
    totalSources: sourceGroups.length,
    totalLeads,
    totalEarnings,
    topSource: top?.label || "—",
    topSourceLeads: top?.leadCount || 0,
  };
}

export function formatSourceRevenue(val) {
  const n = Number(val) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function filterLeadsBySourceKey(leads, sourceKey) {
  const target = String(sourceKey || "").toLowerCase();
  return leads.filter((lead) => resolveLeadSourceKey(lead) === target);
}
