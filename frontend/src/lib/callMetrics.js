/** Minimum connected call duration (seconds) counted as a conversation for KRA/incentives. */
export const CALL_CONVERSATION_MIN_SEC = 120;

export const CALL_CONVERSATION_LABEL = "2 min+";

export function parseCallDurationSeconds(durationStr) {
  if (durationStr == null || durationStr === "—") return 0;
  if (typeof durationStr === "number") return durationStr;
  const raw = String(durationStr).trim();
  if (!raw) return 0;
  if (raw.includes(":")) {
    const parts = raw.split(":").map((p) => parseInt(p, 10) || 0);
    if (parts.length >= 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function isConversationCall(durationOrSec) {
  const sec =
    typeof durationOrSec === "number"
      ? durationOrSec
      : parseCallDurationSeconds(durationOrSec);
  return sec >= CALL_CONVERSATION_MIN_SEC;
}

export function countConversationCalls(calls, { periodFilter } = {}) {
  const list = Array.isArray(calls) ? calls : [];
  const scoped = periodFilter ? periodFilter(list) : list;
  return scoped.filter((c) => isConversationCall(c?.durationSec ?? c?.duration)).length;
}

export function phonesMatchLoose(a, b) {
  const da = String(a || "").replace(/\D/g, "");
  const db = String(b || "").replace(/\D/g, "");
  if (!da || !db) return false;
  if (da === db) return true;
  return da.slice(-10) === db.slice(-10);
}

export function isMissedCall(call = {}) {
  if (call.type === "miss") return true;
  const outcome = String(call.outcome || "").toLowerCase();
  if (/not connected|not pick|missed|rejected|no answer|busy|unanswered|not answered/.test(outcome)) {
    return true;
  }
  const durationSec = Number.isFinite(call.durationSec)
    ? call.durationSec
    : parseCallDurationSeconds(call.duration);
  if (durationSec >= CALL_CONVERSATION_MIN_SEC) return false;
  return durationSec <= 0;
}
