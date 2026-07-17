import { parseCallDurationSeconds } from "./callMetrics.js";
import { localDateKey } from "./periodFilter.js";

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTimePart(d) {
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Parse API / mock call timestamps into a local Date. */
export function parseCallDate(value) {
  if (value == null || value === "" || value === "—") return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^today(\s|,|$)/i.test(raw)) {
    const m = raw.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    if (m) {
      const d = startOfDay(new Date());
      const parsed = new Date(`${localDateKey(d)} ${m[1]}`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return startOfDay(new Date());
  }
  if (/^yesterday(\s|,|$)/i.test(raw)) {
    const m = raw.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - 1);
    if (m) {
      const parsed = new Date(`${localDateKey(d)} ${m[1]}`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return d;
  }

  const isoLike = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(isoLike);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const withYear = raw.match(/^(\d{1,2}\s+\w+),?\s+(\d{1,2}:\d{2}\s*[AP]M)$/i);
  if (withYear) {
    const d = new Date(`${withYear[1]} ${new Date().getFullYear()} ${withYear[2]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Human-friendly call timestamp:
 * Today → "Today, 11:47 am", Yesterday → "Yesterday, 4:20 pm", else "17 Jul, 11:47 am"
 */
export function formatCallDisplayDate(value, now = new Date()) {
  const d = parseCallDate(value);
  if (!d) return value ? String(value) : "—";

  const todayKey = localDateKey(now);
  const yesterdayKey = localDateKey(startOfDay(new Date(now.getTime() - 86400000)));
  const callKey = localDateKey(d);
  const timePart = formatTimePart(d);

  if (callKey === todayKey) return `Today, ${timePart}`;
  if (callKey === yesterdayKey) return `Yesterday, ${timePart}`;

  const datePart = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
  return `${datePart}, ${timePart}`;
}

/** Latest call in period for a lead → friendly label; falls back to lead activity date. */
export function resolveLeadLastActivityLabel(lead, periodCalls = []) {
  if (!lead) return "—";

  if (lead._fromCall) {
    return formatCallDisplayDate(lead.callAt || lead.startedAt || lead.date);
  }

  let latestMs = 0;
  for (const call of periodCalls) {
    const matchesLead = call.leadId != null && String(call.leadId) === String(lead.id);
    const leadPhone = lead.phone || lead.clientPhone;
    const callPhone = call.phone || call.clientPhone;
    const matchesPhone = leadPhone && callPhone && (
      String(leadPhone).replace(/\D/g, "").slice(-10) === String(callPhone).replace(/\D/g, "").slice(-10)
    );
    if (!matchesLead && !matchesPhone) continue;

    const d = parseCallDate(call.callAt || call.startedAt || call.createdAt || call.date);
    if (!d) continue;
    const ms = d.getTime();
    if (ms > latestMs) latestMs = ms;
  }

  if (latestMs > 0) {
    return formatCallDisplayDate(new Date(latestMs).toISOString());
  }

  const fallback = lead.lastActivityAt || lead.updatedAt || lead.createdAt;
  return fallback ? formatCallDisplayDate(fallback) : (lead.last || "—");
}

/** Format seconds as mm:ss or h:mm:ss for connected calls. */
export function formatCallDuration(durationOrSec) {
  const sec = Number.isFinite(durationOrSec)
    ? Math.max(0, Math.floor(durationOrSec))
    : parseCallDurationSeconds(durationOrSec);
  if (!sec) return "—";
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function resolveCallDurationSec(call = {}) {
  if (Number.isFinite(call.durationSec) && call.durationSec > 0) {
    return call.durationSec;
  }
  const fromDuration = parseCallDurationSeconds(call.duration);
  return fromDuration > 0 ? fromDuration : 0;
}

/** Connected = client picked up (duration > 0). */
export function isCallConnected(call = {}) {
  return resolveCallDurationSec(call) > 0;
}

export function formatCallDurationLabel(call = {}) {
  if (!isCallConnected(call)) return null;
  if (call.duration && call.duration !== "—") return call.duration;
  return formatCallDuration(resolveCallDurationSec(call));
}
