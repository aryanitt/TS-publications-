export const RANGE_TABS = [
  { id: "today", label: "Today", shortLabel: "Today" },
  { id: "week", label: "This Week", shortLabel: "Week" },
  { id: "month", label: "This Month", shortLabel: "Month" },
  { id: "custom", label: "Custom", shortLabel: "Custom" },
];

/** Shared compact pill classes for date/period filters */
export const PERIOD_PILL_BTN =
  "px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all border whitespace-nowrap shrink-0";
export const PERIOD_PILL_ACTIVE =
  "border-rose-600 bg-gradient-to-r from-red-600 via-rose-500 to-pink-500 text-white shadow-sm";
export const PERIOD_PILL_INACTIVE =
  "border-rose-200 bg-white text-gray-600 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50";

const LABEL_BY_ID = Object.fromEntries(RANGE_TABS.map((t) => [t.id, t.label]));

export function presetToApiLabel(preset) {
  return LABEL_BY_ID[preset] || "This Month";
}

export function defaultPresetForRoute(pathname) {
  if (pathname === "/") return "week";
  if (pathname === "/team") return "month";
  return "month";
}

export function emptyRangeState(pathname) {
  return { preset: defaultPresetForRoute(pathname), fromDate: "", toDate: "" };
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolve preset + optional custom dates to ISO date strings (YYYY-MM-DD). */
export function getDateBounds(preset, fromDate = "", toDate = "") {
  const now = new Date();
  if (preset === "custom" && fromDate && toDate) {
    return { start: fromDate, end: toDate };
  }
  if (preset === "today") {
    const s = startOfDay(now);
    return { start: s.toISOString().slice(0, 10), end: endOfDay(now).toISOString().slice(0, 10) };
  }
  if (preset === "week") {
    const s = startOfDay(now);
    s.setDate(s.getDate() - s.getDay());
    return { start: s.toISOString().slice(0, 10), end: endOfDay(now).toISOString().slice(0, 10) };
  }
  const s = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return { start: s.toISOString().slice(0, 10), end: endOfDay(now).toISOString().slice(0, 10) };
}
