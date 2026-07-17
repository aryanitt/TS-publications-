import { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";

import {
  DollarSign, Users, Activity, FileText,
  ArrowRight, Sparkles, AlertTriangle, TrendingUp, TrendingDown,
  BellRing, Brain, CheckCircle2,
  CalendarDays, Zap, ChevronDown, Search, X, Info as InfoIcon,
  Medal, Trophy, GitBranch, BarChart3, Bell, Phone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
  XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell,
  ComposedChart, Line, ReferenceLine
} from "recharts";
import {
  StatCard, GlassCard, Badge, Avatar, Drawer,
  SectionHeader, priorityTone, stageTone
} from "../components/Primitives.jsx";
import { useDateRange } from "../context/DateRangeContext.jsx";
import { buildPeriodQueryParams } from "../lib/periodQuery.js";
import { useAdmin } from "../context/AdminContext.jsx";
import { apiGet, readCachedJson, readStaleCachedJson } from "../lib/api.js";
import { mergeFilterData } from "../lib/fetchWithFallback.js";
import { useTenantCallyzerStats } from "../lib/useTenantCallyzerStats.js";
import { PercentDisk } from "../components/PercentRing.jsx";
import { formatINR } from "../lib/indianFormat.js";

// ─── Icon maps ────────────────────────────────────────────────────────────────
const iconMap = { DollarSign, Users, Activity, FileText, Phone, Trophy };

const PANEL = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

function SectionHead({ icon: Icon, title, sub, action, compact = false }) {
  return (
    <div className={`flex items-start justify-between gap-2 sm:gap-3 min-w-0 ${compact ? "mb-2.5 sm:mb-4" : "mb-4"}`}>
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <div className={`rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${compact ? "w-8 h-8" : "w-9 h-9"}`}>
          <Icon className={`text-slate-600 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
        </div>
        <div className="min-w-0">
          <h3 className={`font-display font-bold text-slate-900 ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>{title}</h3>
          {sub && <p className={`text-slate-500 mt-0.5 line-clamp-2 sm:line-clamp-none ${compact ? "text-[10px]" : "text-[11px]"}`}>{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Real service options ─────────────────────────────────────────────────────
const SERVICE_OPTIONS = [
  "All Services",
  "Web Development",
  "SEO",
  "UI/UX Design",
  "Automation",
  "CRM Setup",
  "Marketing",
];

const PIPELINE_STAGES = ["Leads", "Contacted", "Qualified", "Proposal", "Negotiation", "Conversion"];

const ADMIN_DASH_CACHE_TTL = 3 * 60 * 1000;

function hydrateDashboardCache() {
  const cached = readCachedJson("/api/dashboard") ?? readStaleCachedJson("/api/dashboard");
  if (!cached) return null;
  return {
    filterData: cached.filterData ?? null,
    aiInsights: Array.isArray(cached.aiInsights) ? cached.aiInsights : [],
    revenueSeries: cached.revenueSeries?.length ? cached.revenueSeries : [],
  };
}

function hydrateTeamCache() {
  const cached = readCachedJson("/api/team/employees") ?? readStaleCachedJson("/api/team/employees");
  if (cached?.success && cached.employees?.length) return cached.employees;
  return [];
}

function hydrateActivityCache() {
  const cached = readCachedJson("/api/activity") ?? readStaleCachedJson("/api/activity");
  if (!cached?.success || !cached.activities?.length) return null;
  return cached.activities.slice(0, 8).map((row) => ({
    text: row.user_name ? `${row.action} — ${row.user_name}` : row.action,
    createdAt: row.created_at,
  }));
}

const EMPTY_FILTER_RANGE = {
  kpis: [
    { label: "Total Revenue", value: "₹0", icon: "DollarSign" },
    { label: "Cash Collected", value: "₹0", icon: "DollarSign" },
    { label: "Total Leads", value: "0", icon: "Users" },
    { label: "Total Calls Made", value: "0", icon: "Phone" },
    { label: "Qualified Leads", value: "0", icon: "FileText" },
    { label: "Pipeline Value", value: "₹0", icon: "DollarSign" },
    { label: "Closings", value: "0", icon: "Trophy" },
  ],
  leaderboard: [],
  metrics: { pickup: 0, qualification: 0, conversion: 0 },
  insights: [],
  activity: [],
};

const EMPTY_FILTER_DATA = {
  today: EMPTY_FILTER_RANGE,
  week: EMPTY_FILTER_RANGE,
  month: EMPTY_FILTER_RANGE,
};

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
  }),
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

// ─── Tiny hook: track if viewport is mobile (< 640px) ─────────────────────────
function useIsMobile(bp = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < bp);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bp]);
  return isMobile;
}

// ─── Portal-based tooltip ─────────────────────────────────────────────────────
function TooltipPortal({ children, anchorRef, visible }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState("above");

  useEffect(() => {
    if (!visible || !anchorRef?.current) return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const TOOLTIP_W = 164, TOOLTIP_H = 100, MARGIN = 8;
      const vw = window.innerWidth, vh = window.innerHeight;
      const spaceAbove = rect.top, spaceBelow = vh - rect.bottom;
      const above = spaceAbove >= TOOLTIP_H + MARGIN || spaceAbove > spaceBelow;
      setPlacement(above ? "above" : "below");
      let left = rect.left + rect.width / 2 - TOOLTIP_W / 2 + window.scrollX;
      left = Math.max(MARGIN, Math.min(left, vw - TOOLTIP_W - MARGIN));
      const top = above
        ? rect.top + window.scrollY - TOOLTIP_H - MARGIN
        : rect.bottom + window.scrollY + MARGIN;
      setPos({ top, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [visible, anchorRef]);

  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: placement === "above" ? 6 : -6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: placement === "above" ? 6 : -6, scale: 0.95 }}
          transition={{ duration: 0.14 }}
          style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 99999, pointerEvents: "none" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Key metric circle with hover info ───────────────────────────────────────
function MetricCircle({ pct, color, glow, label, shortLabel, info, size = 72, compact = false }) {
  const [pinned, setPinned] = useState(false);
  const safePct = Math.min(100, Math.max(0, Number(pct) || 0));
  const showInfo = pinned;

  return (
    <div className="group relative flex flex-col items-center gap-1.5 sm:gap-2 w-full min-w-0">
      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        onBlur={() => setPinned(false)}
        className="relative rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-[1.06] focus:scale-[1.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300"
        aria-label={`${label}: ${safePct}%. ${info}`}
        aria-expanded={showInfo}
      >
        <PercentDisk value={safePct} color={color} glow={glow} size={size} compact={compact} />
      </button>

      <span className={`text-slate-600 font-semibold text-center leading-tight px-0.5 pointer-events-none ${
        compact ? "text-[8px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"
      }`}
      >
        {compact ? shortLabel : label}
      </span>

      <div
        className={`pointer-events-none absolute bottom-[calc(100%-4px)] left-1/2 -translate-x-1/2 z-30 w-[min(92vw,200px)] transition-all duration-200 ${
          showInfo
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
        }`}
        role="tooltip"
      >
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg shadow-slate-200/80 text-left">
          <p className="text-[11px] font-bold text-slate-900">{label}</p>
          <p className="text-lg font-black tabular-nums mt-0.5" style={{ color }}>{safePct}%</p>
          <p className="text-[10px] text-slate-500 mt-1 leading-snug">{info}</p>
        </div>
        <div className="mx-auto w-2.5 h-2.5 rotate-45 bg-white border-r border-b border-slate-200 -mt-[5px]" />
      </div>
    </div>
  );
}

// ─── Activity dot ─────────────────────────────────────────────────────────────
function ActivityDot({ type }) {
  return type === "check"
    ? <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      </div>
    : <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
      </div>;
}

// ─── Custom date popover ──────────────────────────────────────────────────────
function CustomDatePopover({ fromDate, setFromDate, toDate, setToDate, onClose, anchorRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef(null);

  useEffect(() => {
    const update = () => {
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const POPOVER_W = 288, vw = window.innerWidth;
      let left = rect.right - POPOVER_W + window.scrollX;
      left = Math.max(8, Math.min(left, vw - POPOVER_W - 8));
      setPos({ top: rect.bottom + window.scrollY + 8, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [anchorRef]);

  useEffect(() => {
    const h = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, anchorRef]);

  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(
    <motion.div ref={popoverRef}
      initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 99999 }}
      className="p-4 rounded-xl border border-primary/30 bg-[oklch(0.14_0.014_25/0.98)] backdrop-blur-xl shadow-2xl shadow-black/60 w-72 max-w-[calc(100vw-2rem)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-foreground tracking-wide">Custom Date Range</span>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60 transition-colors [color-scheme:dark] cursor-pointer" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60 transition-colors [color-scheme:dark] cursor-pointer" />
        </div>
        <button onClick={onClose} className="w-full py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold tracking-wide hover:opacity-90 transition-opacity">
          Apply Range
        </button>
      </div>
    </motion.div>,
    document.body
  );
}

// ─── KPI Filter Bar ───────────────────────────────────────────────────────────
function KPIFilterBar({ active, setActive, fromDate, setFromDate, toDate, setToDate }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const customBtnRef = useRef(null);
  const tabs = [
    { id: "today", label: "Today"      },
    { id: "week",  label: "This Week"  },
    { id: "month", label: "This Month" },
    { id: "custom",label: "Custom"     },
  ];
  return (
    <div className="relative flex items-center gap-1.5 flex-wrap sm:flex-nowrap sm:flex-shrink-0">
      {tabs.map(t => (
       <button
       key={t.id}
       ref={t.id === "custom" ? customBtnRef : undefined}
       onClick={() => {
         setActive(t.id);
         if (t.id === "custom") setShowCalendar(true);
         else setShowCalendar(false);
       }}
       className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all duration-200 border whitespace-nowrap
         ${active === t.id
           ? "border-rose-600 bg-gradient-to-r from-red-600 via-rose-500 to-pink-500 text-white"
           : "border-rose-200 bg-white text-gray-600 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50"}`}
     >
          {t.id === "custom" && active === "custom" && fromDate && toDate
            ? <span className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" />{fromDate.slice(5)} → {toDate.slice(5)}</span>
            : t.label}
        </button>
      ))}
      <AnimatePresence>
        {showCalendar && (
          <CustomDatePopover fromDate={fromDate} setFromDate={setFromDate}
            toDate={toDate} setToDate={setToDate}
            onClose={() => setShowCalendar(false)} anchorRef={customBtnRef} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PREMIUM KPI Cards Row ────────────────────────────────────────────────────
const KPI_GRADIENTS = [
  {
    accent: "from-pink-200/70 via-pink-100/30",
    glow: "#ec4899",
  },
  {
    accent: "from-rose-200/70 via-rose-100/30",
    glow: "#f43f5e",
  },
  {
    accent: "from-fuchsia-200/70 via-fuchsia-100/30",
    glow: "#d946ef",
  },
  {
    accent: "from-pink-300/60 via-rose-100/30",
    glow: "#e11d48",
  },
  {
    accent: "from-red-200/60 via-pink-100/30",
    glow: "#dc2626",
  },
  {
    accent: "from-indigo-200/60 via-pink-100/30",
    glow: "#6366f1",
  },
  {
    accent: "from-amber-200/60 via-rose-100/30",
    glow: "#f59e0b",
  },
];

function KPICardsRow({ kpiData, filterKey }) {
  const cardDefaults = [
    { change: "+14.2%", sub: "MoM Gross Payout" },
    { change: "+18.4%", sub: "Cash Generated" },
    { change: "+8.5%",  sub: "New Leads" },
    { change: "+12.4%", sub: "Call Volume" },
    { change: "+6.2%",  sub: "Qualified" },
    { change: "+4.2%",  sub: "Target vs Achieved" },
    { change: "+10.5%", sub: "Closed Won" },
  ];

  const tones = ["success", "purple", "warning", "info", "primary", "indigo", "success"];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={filterKey}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4"
        initial="hidden"
        animate="show"
        exit="hidden"
        variants={staggerContainer}
      >
        {kpiData.map((k, i) => {
          const Icon = iconMap[k.icon] || DollarSign;
          const defaultVal = cardDefaults[i] || { change: "+4.2%", sub: "vs last period" };
          const change = k.trendVal || defaultVal.change;
          const subText = k.sub || defaultVal.sub;
          const tone = tones[i % tones.length];

          return (
            <motion.div
              key={k.label}
              variants={fadeUp}
              custom={i}
              className="col-span-1 min-w-0 flex flex-col"
            >
              <StatCard
                label={k.label}
                value={k.value}
                change={change}
                sub={subText}
                icon={Icon}
                tone={tone}
                className="h-full"
                hover
              />
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Service Breakdown tooltip content ───────────────────────────────────────
function ServiceTooltipContent({ data }) {
  if (!data) return null;
  const convPct = data.leads > 0 ? Math.round((data.conv / data.leads) * 100) : 0;
  const qualPct = data.leads > 0 ? Math.round((data.qualified / data.leads) * 100) : 0;
  return (
    <div className="bg-[oklch(0.13_0.014_25/0.98)] border border-primary/40 rounded-lg p-3 shadow-2xl shadow-black/70 backdrop-blur-xl w-[150px]">
      <p className="text-[11px] font-bold text-primary mb-2 truncate">{data.name}</p>
      <div className="space-y-1.5">
        {[["Leads", String(data.leads)], ["Qualified", `${data.qualified} (${qualPct}%)`], ["Conversions", `${data.conv} (${convPct}%)`], ["Revenue", data.rev]].map(([label, val]) => (
          <div key={label} className="flex justify-between items-baseline gap-2">
            <span className="text-[9px] text-muted-foreground leading-none">{label}</span>
            <span className={`text-[10px] font-semibold leading-none tabular-nums ${label === "Revenue" ? "text-primary" : "text-foreground"}`}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini bar group ───────────────────────────────────────────────────────────
function MiniBarGroup({ leads, qualified, conv, maxVal, hovered }) {
  const H = 84, bw = 12, gap = 5;
  const scale = v => Math.max(3, (v / maxVal) * H);
  const bars = [
    { v: leads,     fill: hovered ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.28)" },
    { v: qualified, fill: hovered ? "oklch(0.68 0.22 18 / 0.85)" : "oklch(0.65 0.22 18 / 0.7)" },
    { v: conv,      fill: hovered ? "oklch(0.65 0.28 18)" : "oklch(0.62 0.26 18)" },
  ];
  return (
    <svg width={3 * bw + 2 * gap} height={H} viewBox={`0 0 ${3 * bw + 2 * gap} ${H}`} overflow="visible">
      {bars.map(({ v, fill }, i) => {
        const h = scale(v);
        return <rect key={i} x={i * (bw + gap)} y={H - h} width={bw} height={h} fill={fill} rx={3}
          style={{ transition: "all 0.2s ease" }} />;
      })}
    </svg>
  );
}

// ─── Service Wise Breakdown ───────────────────────────────────────────────────
function ServiceBreakdown({ services, filterKey }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const colRefs = useRef([]);
  const maxVal = Math.max(...services.map(s => s.leads));
  const PER_COL = 112;
  const chartMinWidth = Math.max(services.length * PER_COL, 380);

  useEffect(() => { colRefs.current = colRefs.current.slice(0, services.length); }, [services.length]);

  return (
    <GlassCard className="p-5 sm:p-6 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <h3 className="text-sm font-semibold text-foreground tracking-wide">Service Wise Breakdown</h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          {[{ label: "Leads", bg: "rgba(255,255,255,0.28)" }, { label: "Qualified", bg: "oklch(0.65 0.22 18 / 0.7)" }, { label: "Conversions", bg: "oklch(0.62 0.26 18)" }].map(({ label, bg }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: bg }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-hidden -mx-2 px-2 pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
        <AnimatePresence mode="wait">
          <motion.div key={filterKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            style={{ minWidth: chartMinWidth }}
            className="flex items-end justify-between gap-5 sm:gap-6 px-1 pt-4 pb-2">
            {services.map((s, i) => (
              <motion.div key={s.name} ref={el => colRefs.current[i] = el}
                className="flex flex-col items-center gap-3 flex-1 min-w-[88px] cursor-pointer relative group"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.38 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}>
                <TooltipPortal anchorRef={{ current: colRefs.current[i] }} visible={hoveredIdx === i}>
                  <ServiceTooltipContent data={s} />
                </TooltipPortal>
                <motion.div animate={{ y: hoveredIdx === i ? -3 : 0 }} transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-3 w-full">
                  <MiniBarGroup leads={s.leads} qualified={s.qualified} conv={s.conv} maxVal={maxVal} hovered={hoveredIdx === i} />
                  <div className={`px-2 py-1.5 rounded-lg border w-full text-center transition-all duration-200
                    ${hoveredIdx === i ? "bg-primary/15 border-primary/40" : "bg-secondary/50 border-border/60"}`}>
                    <p className="text-[10px] text-muted-foreground truncate">{s.name}</p>
                  </div>
                  <p className={`text-[11px] font-bold transition-colors duration-200 ${hoveredIdx === i ? "text-primary" : "text-primary/70"}`}>{s.rev}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="sm:hidden text-[10px] text-muted-foreground/60 text-center mt-2">← Swipe to view all services →</p>
    </GlassCard>
  );
}

// ─── Leader Board multi-segment circle ───────────────────────────────────────
const LEADER_METRIC_SEGMENTS = [
  { id: "leads", label: "Leads", short: "Leads", color: "#3b82f6" },
  { id: "contact", label: "Contact Rate", short: "Contact", color: "#8b5cf6" },
  { id: "conv", label: "Conv. Rate", short: "Rate", color: "#10b981" },
  { id: "conversions", label: "Conversions", short: "Deals", color: "#f59e0b" },
  { id: "revenue", label: "Revenue", short: "Rev.", color: "#f43f5e" },
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSegment(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, rOuter, startAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    "M", outerStart.x, outerStart.y,
    "A", rOuter, rOuter, 0, largeArc, 1, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", rInner, rInner, 0, largeArc, 0, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}

function parseLeaderPct(value) {
  const n = parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function leaderMetricValues(emp) {
  return {
    leads: { display: String(emp.leads ?? 0), raw: Number(emp.leads) || 0 },
    contact: { display: emp.qualR || "0%", raw: parseLeaderPct(emp.qualR) },
    conv: { display: emp.convR || "0%", raw: parseLeaderPct(emp.convR) },
    conversions: { display: String(emp.conv ?? 0), raw: Number(emp.conv) || 0 },
    revenue: { display: emp.rev || "₹0", raw: 0 },
  };
}

function LeaderMetricRing({ emp, rankIdx }) {
  const [activeId, setActiveId] = useState(null);
  const viewSize = 112;
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const stroke = 15;
  const rOuter = (viewSize - stroke) / 2;
  const rInner = rOuter - stroke;
  const gap = 2.8;
  const segmentCount = LEADER_METRIC_SEGMENTS.length;
  const slice = 360 / segmentCount;
  const values = leaderMetricValues(emp);
  const active = LEADER_METRIC_SEGMENTS.find((s) => s.id === activeId);
  const activeVal = active ? values[active.id] : null;
  const rank = LEADERBOARD_RANKS[rankIdx] || LEADERBOARD_RANKS[2];

  return (
    <div
      className="relative w-full max-w-[104px] aspect-square mx-auto"
      onMouseLeave={() => setActiveId(null)}
    >
      <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full h-full overflow-visible">
        {LEADER_METRIC_SEGMENTS.map((seg, i) => {
          const start = i * slice + gap / 2;
          const end = (i + 1) * slice - gap / 2;
          const isActive = activeId === seg.id;
          const isDimmed = activeId && !isActive;
          return (
            <path
              key={seg.id}
              d={describeDonutSegment(cx, cy, rOuter, rInner, start, end)}
              fill={seg.color}
              stroke="#fff"
              strokeWidth={2.2}
              opacity={isDimmed ? 0.42 : 1}
              className="cursor-pointer transition-all duration-150 ease-out"
              style={{
                filter: isActive ? `brightness(1.06) drop-shadow(0 1px 4px ${seg.color}55)` : undefined,
              }}
              onMouseEnter={() => setActiveId(seg.id)}
              onFocus={() => setActiveId(seg.id)}
              onBlur={() => setActiveId(null)}
              onTouchStart={() => setActiveId(seg.id)}
              role="img"
              aria-label={`${seg.label}: ${values[seg.id].display}`}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={rInner - 1.5} fill="#fff" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-1">
        {active && activeVal ? (
          <>
            <span
              className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wide leading-none truncate max-w-full"
              style={{ color: active.color }}
            >
              {active.short}
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums leading-none mt-0.5">
              {activeVal.display}
            </span>
          </>
        ) : (
          <>
            <span className="text-[7px] sm:text-[8px] font-semibold uppercase tracking-wide leading-none" style={{ color: rank.textColor }}>
              Conv.
            </span>
            <span className="text-base sm:text-lg font-black tabular-nums leading-none mt-0.5" style={{ color: rank.textColor }}>
              {values.conv.display}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function LeaderBoardLegend() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 max-w-[320px]">
      {LEADER_METRIC_SEGMENTS.map((seg) => (
        <span key={seg.id} className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
          {seg.short}
        </span>
      ))}
    </div>
  );
}

const LEADERBOARD_RANKS = [
  {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    medal: "text-amber-500 fill-amber-100",
    colors: ["#f59e0b", "#eab308"],
    textColor: "#b45309",
  },
  {
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    medal: "text-slate-400 fill-slate-100",
    colors: ["#94a3b8", "#64748b"],
    textColor: "#475569",
  },
  {
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    medal: "text-orange-600 fill-orange-100",
    colors: ["#fb923c", "#ea580c"],
    textColor: "#c2410c",
  },
  {
    badge: "bg-rose-50 text-rose-600 border-rose-200",
    medal: "text-rose-400 fill-rose-100",
    colors: ["#fb7185", "#e11d48"],
    textColor: "#be123c",
  },
  {
    badge: "bg-violet-50 text-violet-600 border-violet-200",
    medal: "text-violet-400 fill-violet-100",
    colors: ["#a78bfa", "#7c3aed"],
    textColor: "#6d28d9",
  },
];

// ─── Leader Board ─────────────────────────────────────────────────────────────
function fmtLeaderRevenue(n) {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return v > 0 ? `₹${Math.round(v)}` : "₹0";
}

function buildLeaderboardFromEmployees(employees) {
  if (!Array.isArray(employees) || !employees.length) return [];
  return employees
    .map((emp) => {
      const leads = Number(emp.leads ?? 0);
      const conv = Number(emp.conv ?? emp.deals ?? 0);
      const contacted = Number(emp.contacted ?? 0);
      const convPct = leads ? Math.round((conv / leads) * 100) : 0;
      const contactPct = leads ? Math.round((contacted / leads) * 100) : 0;
      return {
        name: emp.name,
        leads,
        conv,
        convR: `${convPct}%`,
        qualR: `${contactPct}%`,
        rev: fmtLeaderRevenue(emp.revenue),
      };
    })
    .sort((a, b) => b.conv - a.conv || b.leads - a.leads || a.name.localeCompare(b.name))
    .slice(0, 3);
}

function LeaderBoard({ employees }) {
  const topPerformers = (Array.isArray(employees) ? employees : []).slice(0, 3);

  return (
    <div className={`${PANEL} p-3 sm:p-4 min-w-0`}>
      <SectionHead
        icon={Trophy}
        title="Leader Board"
        sub="Top performers by conversion rate"
        compact
        action={topPerformers.length > 0 ? <LeaderBoardLegend /> : null}
      />

      {topPerformers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/30 py-8 text-center">
          <Trophy className="w-7 h-7 text-rose-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">No performance data yet</p>
          <p className="text-xs text-slate-400 mt-1">Add team members and assign leads to populate the leaderboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {topPerformers.map((emp, i) => {
            const rank = LEADERBOARD_RANKS[i] || LEADERBOARD_RANKS[2];
            const isFirst = i === 0;

            return (
              <div
                key={`${emp.name}-${i}`}
                className={`relative rounded-xl border px-2 py-2.5 sm:px-3 sm:py-3 flex flex-col items-center gap-2 min-w-0 transition-shadow ${
                  isFirst
                    ? "border-amber-200/90 bg-gradient-to-b from-amber-50/70 to-white shadow-sm"
                    : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200"
                }`}
              >
                <div className="w-full flex items-center justify-between gap-1.5 min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-800 truncate leading-tight">
                    {emp.name}
                  </p>
                  <span className={`inline-flex items-center gap-0.5 shrink-0 text-[8px] sm:text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${rank.badge}`}>
                    <Medal className={`w-2.5 h-2.5 ${rank.medal}`} />
                    #{i + 1}
                  </span>
                </div>

                <LeaderMetricRing emp={emp} rankIdx={i} />

                <div className="w-full grid grid-cols-2 gap-x-1 gap-y-0.5 text-[8px] sm:text-[9px] leading-tight border-t border-slate-100/80 pt-2">
                  <span className="text-slate-400">Leads</span>
                  <span className="text-right font-bold text-slate-700 tabular-nums">{emp.leads}</span>
                  <span className="text-slate-400">Deals</span>
                  <span className="text-right font-bold text-slate-700 tabular-nums">{emp.conv}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─── Service Dropdown ─────────────────────────────────────────────────────────
function ServiceDropdown({ value, onChange, options }) {
  const isMobile = useIsMobile(640);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 220 });

  const calcPos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const MENU_W = 224, MENU_H = 300;
    const spaceBelow = vh - rect.bottom;
    const above = spaceBelow < MENU_H && rect.top > spaceBelow;
    let left = rect.left + window.scrollX;
    if (rect.left + MENU_W > vw) left = rect.right - MENU_W + window.scrollX;
    left = Math.max(8, left);
    const top = above ? rect.top + window.scrollY - MENU_H - 4 : rect.bottom + window.scrollY + 4;
    setMenuPos({ top, left, width: Math.max(rect.width, MENU_W), above });
  };

  useEffect(() => {
    if (!open || isMobile) return;
    const h = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, isMobile]);

  useEffect(() => {
    if (open && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    calcPos();
    const update = () => calcPos();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open, isMobile]);

  const handleOpen = () => { if (!open && !isMobile) calcPos(); setOpen(o => !o); setSearch(""); };
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button ref={btnRef} onClick={handleOpen}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200
          ${open ? "border-slate-300 bg-white text-slate-900 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"}`}>
        <span className="max-w-[110px] truncate">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && !isMobile && typeof document !== "undefined" && ReactDOM.createPortal(
          <motion.div ref={menuRef}
            key="desktop-menu"
            initial={{ opacity: 0, y: menuPos.above ? 6 : -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: menuPos.above ? 6 : -6, scale: 0.97 }} transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "absolute", top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 99999, maxHeight: "min(320px, 60vh)" }}
            className="rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none w-full" autoFocus />
              </div>
            </div>
            <div className="py-1.5 overflow-y-auto">
              {filtered.map(opt => (
                <button key={opt} onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2.5 text-xs transition-all duration-150 flex items-center gap-2
                    ${value === opt
                      ? "text-rose-700 bg-rose-50 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"}`}>
                  {value === opt && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                  )}
                  {value !== opt && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                  {opt}
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No results</p>}
            </div>
          </motion.div>,
          document.body
        )}

        {open && isMobile && typeof document !== "undefined" && ReactDOM.createPortal(
          <>
            <motion.div key="mobile-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99998 }} className="bg-black/40 backdrop-blur-sm" />
            <motion.div ref={menuRef} key="mobile-sheet" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 99999 }}
              className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800 tracking-wide">Select Service</span>
                <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input type="text" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none w-full" autoFocus />
                </div>
              </div>
              <div className="overflow-y-auto py-1.5 flex-1">
                {filtered.map(opt => (
                  <button key={opt} onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-all duration-150 flex items-center gap-3
                      ${value === opt
                        ? "text-rose-700 bg-rose-50 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"}`}>
                    {value === opt && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />}
                    {value !== opt && <span className="w-2 h-2 flex-shrink-0" />}
                    {opt}
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-4 py-3 text-xs text-slate-400">No results</p>}
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pipeline stage tooltip (portal) ─────────────────────────────────────────
// Renders above the hovered bar via a portal — no flickering, no layout shift
function PipelineTooltip({ stage, count, convPct, dropPct, prevStage, anchorRef, visible }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!visible || !anchorRef?.current) return;
    const TOOLTIP_W = 192, TOOLTIP_H = 110, MARGIN = 8;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const vw = window.innerWidth;
      let left = rect.left + rect.width / 2 - TOOLTIP_W / 2 + window.scrollX;
      left = Math.max(MARGIN, Math.min(left, vw - TOOLTIP_W - MARGIN));
      const top = rect.top + window.scrollY - TOOLTIP_H - 10;
      setPos({ top, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [visible, anchorRef]);

  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.94 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            pointerEvents: "none",
            width: 192,
          }}
        >
          {/* Arrow pointing down */}
          <div className="relative">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg shadow-slate-200/50">
              <p className="text-[11px] font-bold text-slate-800 mb-2.5">{stage}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Count</span>
                  <span className="text-[11px] font-semibold text-slate-800 tabular-nums">{count.toLocaleString()}</span>
                </div>
                {convPct !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">From {prevStage}</span>
                    <span className="text-[11px] font-semibold text-emerald-600 tabular-nums">{convPct}% conv</span>
                  </div>
                )}
                {dropPct !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Drop-off</span>
                    <span className="text-[11px] font-semibold text-rose-600 tabular-nums">↓ {dropPct}%</span>
                  </div>
                )}
              </div>
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-3.5 h-3.5 rotate-45 border-b border-r border-slate-200 bg-white"
              style={{ zIndex: 1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── SALES PIPELINE STATUS: Temperature segmented ribbon visualization ────────
const SEGMENTED_STAGES = ["Contacted", "Qualified", "Meeting", "Negotiation", "Conversion"];

function buildEmptyPipelineGrid() {
  const grid = {};
  for (const temp of ["Hot", "Warm", "Cold"]) {
    grid[temp] = Object.fromEntries(SEGMENTED_STAGES.map((s) => [s, 0]));
  }
  return {
    grid,
    totalLeads: 0,
    conversions: 0,
    overallConv: 0,
    source: "empty",
  };
}

function PipelineBubble({ stage, count, convPct, dropOff, prevStage, index, rowKey, bubbleRefs, hoveredBubble, setHoveredBubble }) {
  const isHov = hoveredBubble && hoveredBubble.row === rowKey && hoveredBubble.col === index;
  const bubbleRef = useRef(null);

  useEffect(() => {
    bubbleRefs.current[`${rowKey}-${index}`] = bubbleRef.current;
  }, [rowKey, index, bubbleRefs]);

  return (
    <div
      ref={bubbleRef}
      className="absolute w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200 transition-all duration-200 cursor-pointer z-20 hover:scale-110 hover:border-slate-300 hover:shadow-md"
      style={{
        left: `${10 + index * 20}%`,
        transform: "translate(-50%, -50%)",
        top: "50%",
      }}
      onMouseEnter={() => setHoveredBubble({ row: rowKey, col: index })}
      onMouseLeave={() => setHoveredBubble(null)}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="text-[8px] sm:text-[10px] md:text-xs font-black text-gray-800 tabular-nums select-none"
        >
          {count}
        </motion.span>
      </AnimatePresence>

      <PipelineTooltip
        stage={stage}
        count={count}
        convPct={convPct}
        dropPct={dropOff}
        prevStage={prevStage}
        anchorRef={{ current: bubbleRefs.current[`${rowKey}-${index}`] }}
        visible={!!isHov}
      />
    </div>
  );
}

function PipelineRow({ rowKey, label, stops, data, bubbleRefs, hoveredBubble, setHoveredBubble }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 group">
      <div className="w-9 sm:w-12 flex-shrink-0 text-right pr-0.5 sm:pr-1">
        <span className="text-[8px] sm:text-[10px] font-black text-slate-600 tracking-wider uppercase">
          {label}
        </span>
      </div>

      <div className="flex-1 relative h-9 sm:h-10 md:h-11 bg-slate-50 border border-slate-200/80 rounded-lg sm:rounded-xl flex items-center">
        {/* Continuous Tapered Gradient Ribbon (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`ribbon-grad-${rowKey}`} x1="0%" y1="0%" x2="100%" y2="0%">
              {stops.map((s, idx) => (
                <stop key={idx} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>
          <path
            d="M 0,16 L 50,17 C 75,17, 75,18, 100,18 C 200,18, 200,26, 300,26 C 400,26, 400,34, 500,34 C 600,34, 600,40, 700,40 C 800,40, 800,46, 900,46 C 950,46, 950,47, 1000,47 L 1000,53 C 950,53, 950,54, 900,54 C 800,54, 800,60, 700,60 C 600,60, 600,66, 500,66 C 400,66, 400,74, 300,74 C 200,74, 200,82, 100,82 C 75,82, 75,83, 50,83 L 0,84 Z"
            fill={`url(#ribbon-grad-${rowKey})`}
            opacity={0.85}
          />
        </svg>

        {/* Stage Bubbles */}
        {SEGMENTED_STAGES.map((stage, i) => {
          const count = data[i] ?? 0;
          const convPct = i > 0 && data[i - 1] > 0 ? Math.round((count / data[i - 1]) * 100) : null;
          const dropOff = i > 0 && data[i - 1] > 0 ? Math.round(((data[i - 1] - count) / data[i - 1]) * 100) : null;
          return (
            <PipelineBubble
              key={stage}
              stage={stage}
              count={count}
              convPct={convPct}
              dropOff={dropOff}
              prevStage={i > 0 ? SEGMENTED_STAGES[i - 1] : null}
              index={i}
              rowKey={rowKey}
              bubbleRefs={bubbleRefs}
              hoveredBubble={hoveredBubble}
              setHoveredBubble={setHoveredBubble}
            />
          );
        })}
      </div>
    </div>
  );
}

function LeadPipeline({ pipelineStats, filterKey, selectedService, onServiceChange, loading }) {
  const [hoveredBubble, setHoveredBubble] = useState(null);
  const bubbleRefs = useRef({});

  const resolved = useMemo(() => {
    if (pipelineStats?.grid && ["database", "mock", "empty", "kanban"].includes(pipelineStats.source)) {
      return pipelineStats;
    }
    return buildEmptyPipelineGrid();
  }, [pipelineStats]);

  const hotData = SEGMENTED_STAGES.map((s) => resolved.grid?.Hot?.[s] ?? 0);
  const warmData = SEGMENTED_STAGES.map((s) => resolved.grid?.Warm?.[s] ?? 0);
  const coldData = SEGMENTED_STAGES.map((s) => resolved.grid?.Cold?.[s] ?? 0);
  const total = resolved.totalLeads ?? 0;
  const closed = resolved.conversions ?? 0;
  const overallConv = resolved.overallConv ?? 0;

  const hotStops = [
    { offset: "0%", color: "#9f1239" },
    { offset: "40%", color: "#e11d48" },
    { offset: "75%", color: "#f43f5e" },
    { offset: "100%", color: "#fda4af" }
  ];

  const warmStops = [
    { offset: "0%", color: "#ea580c" },
    { offset: "50%", color: "#f97316" },
    { offset: "100%", color: "#fcd34d" }
  ];

  const coldStops = [
    { offset: "0%", color: "#2563eb" },
    { offset: "50%", color: "#3b82f6" },
    { offset: "100%", color: "#93c5fd" }
  ];

  return (
    <div className={`${PANEL} p-3 sm:p-4 md:p-5 min-w-0 overflow-hidden`}>
      <SectionHead
        icon={GitBranch}
        title="Sales Pipeline Status"
        sub="Temperature-segmented conversion progression"
      />

      <div className="overflow-x-auto scrollbar-hide -mx-0.5 sm:-mx-1 px-0.5 sm:px-1">
        <div className="min-w-[460px] sm:min-w-[560px] md:min-w-[640px] space-y-1.5 sm:space-y-2">
          <div className="flex items-center">
            <div className="w-9 sm:w-12 flex-shrink-0" />
            <div className="flex-1 relative h-3.5 sm:h-4 text-slate-500 text-[7px] sm:text-[8px] md:text-[9px] font-semibold tracking-wider uppercase">
              <span className="absolute left-[10%] -translate-x-1/2">Contacted</span>
              <span className="absolute left-[30%] -translate-x-1/2">Qualified</span>
              <span className="absolute left-[50%] -translate-x-1/2">Meeting</span>
              <span className="absolute left-[70%] -translate-x-1/2">Negotiation</span>
              <span className="absolute left-[90%] -translate-x-1/2">Conversion</span>
            </div>
          </div>

          <PipelineRow
            rowKey="hot"
            label="Hot"
            stops={hotStops}
            data={hotData}
            bubbleRefs={bubbleRefs}
            hoveredBubble={hoveredBubble}
            setHoveredBubble={setHoveredBubble}
          />

          <PipelineRow
            rowKey="warm"
            label="Warm"
            stops={warmStops}
            data={warmData}
            bubbleRefs={bubbleRefs}
            hoveredBubble={hoveredBubble}
            setHoveredBubble={setHoveredBubble}
          />

          <PipelineRow
            rowKey="cold"
            label="Cold"
            stops={coldStops}
            data={coldData}
            bubbleRefs={bubbleRefs}
            hoveredBubble={hoveredBubble}
            setHoveredBubble={setHoveredBubble}
          />
        </div>
      </div>

      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5 sm:gap-2">
        {[
          { label: "Total Leads",  value: total.toLocaleString() },
          { label: "Conversions",  value: closed.toLocaleString() },
          { label: "Overall Conv", value: `${overallConv}%` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center rounded-lg bg-slate-50 border border-slate-100 py-1.5 sm:py-2 px-0.5 min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums">{value}</p>
            <p className="text-[8px] sm:text-[9px] text-slate-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Insights Panel ────────────────────────────────────────────────────────
function AIInsightsPanel({ insights = [], filterKey, forecastValue = "₹0" }) {
  const isMobile = useIsMobile();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const normalized = (Array.isArray(insights) ? insights : []).map((item) => ({
    tone: item.tone || item.type || "check",
    title: item.title || item.text || "Insight",
    body: item.body || (item.text && item.title ? item.text : ""),
  }));

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    }, 800);
  };

  return (
    <div className={`${PANEL} p-2.5 sm:p-5 relative overflow-hidden min-w-0 w-full`}>
      <SectionHead
        compact={isMobile}
        icon={Sparkles}
        title="AI Insights Center"
        sub={isMobile ? "Next-best actions" : "Next-best-action & risk assessment"}
        action={
          <button
            type="button"
            onClick={handleRefresh}
            className="text-[10px] sm:text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors shrink-0"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      <div className="space-y-2 sm:space-y-3 min-w-0">
        {normalized.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center">
            <Sparkles className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No insights yet</p>
            <p className="text-xs text-slate-400 mt-1">Insights appear from your live CRM activity and lead data.</p>
          </div>
        ) : (
          normalized.slice(0, 2).map((item, idx) => (
            <motion.div
              key={`${item.title}-${idx}`}
              whileHover={isMobile ? undefined : { y: -1 }}
              className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white border border-slate-200 flex items-start gap-2.5 sm:gap-3 w-full min-w-0"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                item.tone === "warn" || item.tone === "warning" || item.tone === "danger"
                  ? "bg-amber-50 border-amber-100 text-amber-600"
                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
              }`}>
                {item.tone === "warn" || item.tone === "warning" || item.tone === "danger"
                  ? <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  : <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug">{item.title}</p>
                {item.body && (
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-relaxed">{item.body}</p>
                )}
              </div>
            </motion.div>
          ))
        )}

        <motion.div
          whileHover={isMobile ? undefined : { y: -1 }}
          className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex flex-col w-full min-w-0"
        >
          <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Pipeline Forecast</p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-1">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 tabular-nums">{forecastValue}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold">from live data</span>
              </div>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
            </div>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden w-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: normalized.length ? "80%" : "0%" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
            />
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-semibold rounded-lg shadow-lg z-10"
          >
            Insights updated
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Imp. Metrics ─────────────────────────────────────────────────────────────
function ImpMetrics({ metrics = {}, filterKey }) {
  const isMobile = useIsMobile();
  const circleSize = isMobile ? 64 : 80;
  const safe = {
    pickup: Number(metrics?.pickup) || 0,
    qualification: Number(metrics?.qualification) || 0,
    conversion: Number(metrics?.conversion) || 0,
  };
  const items = [
    {
      label: "Pickup Rate",
      shortLabel: "Pickup",
      value: safe.pickup,
      color: "#e11d48",
      glow: "#e11d48",
      info: "Share of calls that connected (duration > 0) vs total calls in this period.",
    },
    {
      label: "Qualification Rate",
      shortLabel: "Qualify",
      value: safe.qualification,
      color: "#6366f1",
      glow: "#6366f1",
      info: "Leads with a 2 min+ conversation or meeting booked, as a share of total leads.",
    },
    {
      label: "Conversion Rate",
      shortLabel: "Convert",
      value: safe.conversion,
      color: "#10b981",
      glow: "#10b981",
      info: "Leads marked converted or won vs total leads in this period.",
    },
  ];

  return (
    <div className={`${PANEL} p-2.5 sm:p-5 min-w-0 w-full overflow-visible`}>
      <SectionHead
        compact={isMobile}
        icon={Activity}
        title="Key Metrics"
        sub={isMobile ? "Hover a circle for details" : "Hover each circle for rate details"}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={filterKey}
          className="grid grid-cols-3 gap-2 sm:gap-4 w-full min-w-0 pt-1 overflow-visible"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {items.map((c, i) => (
            <motion.div
              key={c.label}
              className="min-w-0 w-full flex justify-center overflow-visible pt-6 sm:pt-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <MetricCircle
                pct={c.value}
                color={c.color}
                glow={c.glow}
                label={c.label}
                shortLabel={c.shortLabel}
                info={c.info}
                size={circleSize}
                compact={isMobile}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Recent Activity — expanded with more items & no empty gap ───────────────
// ─── Recent Activity Drawer Content ──────────────────────────────────────────
function ActivityHistoryDrawerContent({ items }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const categories = ["All", "Team", "Deals", "Alerts", "System"];

  // Enrich items with timestamps and categories
  const enrichedItems = useMemo(() => {
    return items.map((item, idx) => {
      const text = item.text;
      const t = text.toLowerCase();
      let cat = "System";
      if (t.includes("seo") || t.includes("web dev") || t.includes("ui/ux") || t.includes("crm") || t.includes("automation")) {
        cat = "Deals";
      } else if (t.includes("rahul") || t.includes("priya") || t.includes("aman") || t.includes("aryan")) {
        cat = "Team";
      }
      
      let isAlert = false;
      if (t.includes("drop") || t.includes("below") || t.includes("no-showed") || t.includes("overdue") || t.includes("inactive") || t.includes("overloaded")) {
        isAlert = true;
      }

      return {
        ...item,
        category: cat,
        isAlert: isAlert,
        time: getRelativeTime(idx),
        catTag: getCategoryTag(text)
      };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(search.toLowerCase());
      if (activeFilter === "All") return matchesSearch;
      if (activeFilter === "Team") return item.category === "Team" && matchesSearch;
      if (activeFilter === "Deals") return item.category === "Deals" && matchesSearch;
      if (activeFilter === "Alerts") return item.isAlert && matchesSearch;
      if (activeFilter === "System") return item.category === "System" && matchesSearch;
      return matchesSearch;
    });
  }, [enrichedItems, search, activeFilter]);

  return (
    <div className="space-y-5 flex flex-col h-full">
      {/* Search Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100 transition-all shadow-sm">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search activity timeline..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none w-full"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeFilter === cat
                ? "bg-rose-600 text-white shadow-sm shadow-rose-200"
                : "bg-white border border-slate-200 text-slate-600 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50/60"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto pr-1 relative min-h-0">
        {/* Vertical Timeline Bar */}
        <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-rose-200" />

        <div className="space-y-4 relative">
          {filteredItems.map((item, i) => {
            const config = getActivityIconConfig(item.text);
            const Icon = config.icon;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="flex items-start gap-4 group cursor-default"
              >
                {/* Timeline node icon */}
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 z-10 bg-white transition-all shadow-sm ${config.bg}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content block */}
                <div className="flex-1 bg-white border border-rose-100 group-hover:border-rose-200 hover:bg-rose-50/40 rounded-2xl p-3.5 transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                      {item.catTag}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold tracking-tight whitespace-nowrap">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed font-medium">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {filteredItems.length === 0 && (
            <p className="text-center text-xs text-slate-500 py-8">No activities found matching filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper generators
const getRelativeTime = (index) => {
  const times = [
    "12 mins ago",
    "45 mins ago",
    "1 hour ago",
    "2 hours ago",
    "4 hours ago",
    "5 hours ago",
    "Yesterday, 4:10 PM",
    "Yesterday, 11:20 AM",
    "2 days ago",
    "3 days ago",
    "3 days ago",
    "4 days ago",
    "5 days ago",
    "1 week ago"
  ];
  return times[index % times.length];
};

const getCategoryTag = (text) => {
  const t = text.toLowerCase();
  if (t.includes("seo")) return "SEO";
  if (t.includes("web dev")) return "Web Dev";
  if (t.includes("ui/ux")) return "UI/UX";
  if (t.includes("crm")) return "CRM Setup";
  if (t.includes("automation")) return "Automation";
  if (t.includes("rahul") || t.includes("priya") || t.includes("aman") || t.includes("aryan")) return "Team";
  return "System";
};

const getActivityIconConfig = (text) => {
  const t = text.toLowerCase();
  if (t.includes("drop") || t.includes("below") || t.includes("no-showed") || t.includes("overdue") || t.includes("inactive")) {
    return {
      bg: "bg-amber-50 border-amber-100 text-amber-600 shadow-sm shadow-amber-500/10",
      icon: AlertTriangle
    };
  }
  if (t.includes("overloaded") || t.includes("overcapacity") || t.includes("delay")) {
    return {
      bg: "bg-red-50 border-red-100 text-rose-600 shadow-sm shadow-red-500/10",
      icon: AlertTriangle
    };
  }
  if (t.includes("closed") || t.includes("exceeded") || t.includes("up to") || t.includes("completed") || t.includes("drove") || t.includes("sent")) {
    return {
      bg: "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/10",
      icon: CheckCircle2
    };
  }
  if (t.includes("rahul") || t.includes("priya") || t.includes("aman") || t.includes("aryan") || t.includes("employee") || t.includes("added new")) {
    return {
      bg: "bg-slate-50 border-slate-200 text-slate-600 shadow-sm shadow-slate-500/5",
      icon: InfoIcon
    };
  }
  return {
    bg: "bg-rose-50 border-rose-200 text-rose-600 shadow-sm shadow-rose-500/10",
    icon: InfoIcon
  };
};

// ─── Recent Activity — expanded with more items & no empty gap ───────────────
function RecentActivityPanel({ items, filterKey }) {
  const isMobile = useIsMobile();
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);

  return (
    <div className={`${PANEL} p-2.5 sm:p-5 min-w-0 w-full`}>
      <SectionHead
        compact={isMobile}
        icon={Bell}
        title="Recent Activity"
        sub={isMobile ? "Team & deal updates" : "Live team & deal updates"}
        action={
          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        }
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={filterKey}
          className={`space-y-0.5 pr-1 ${items.length > 6 ? "overflow-y-auto" : "overflow-y-hidden"}`}
          style={{ maxHeight: "240px" }}
          initial="hidden"
          animate="show"
          exit="hidden"
          variants={staggerContainer}
        >
          {items.map((item, i) => {
            const config = getActivityIconConfig(item.text);
            const Icon = config.icon;

            return (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="group flex items-start gap-2.5 py-1.5 px-1.5 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all duration-200 cursor-default"
              >
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 bg-white shadow-sm ${config.bg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2 mb-0.5">
                    <span className="text-[8px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {getCategoryTag(item.text)}
                    </span>
                    <span className="text-[8px] text-slate-400 font-medium shrink-0">{getRelativeTime(i)}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 group-hover:text-slate-900 leading-snug font-medium line-clamp-2">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setActivityDrawerOpen(true)}
        className="mt-3 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-1"
      >
        View all history
        <ArrowRight className="w-3.5 h-3.5 opacity-60" />
      </button>

      <Drawer
        open={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        title="Activity Timeline History"
      >
        <ActivityHistoryDrawerContent items={items} />
      </Drawer>
    </div>
  );
}

// ─── Drawers ──────────────────────────────────────────────────────────────────
function Info({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-secondary/40 border border-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}

function LeadDrawerContent({ lead }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar initials={lead.company.slice(0, 2).toUpperCase()} size={56} />
        <div>
          <div className="font-display text-xl font-semibold">{lead.company}</div>
          <div className="text-xs text-muted-foreground">{lead.contact} · {lead.email}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Info label="Stage"    value={<Badge tone={stageTone(lead.stage)}>{lead.stage}</Badge>} />
        <Info label="Priority" value={<Badge tone={priorityTone(lead.priority)}>{lead.priority}</Badge>} />
        <Info label="Revenue"  value={formatINR(lead.revenue)} />
        <Info label="Assignee" value={lead.assignee} />
        <Info label="Phone"    value={lead.phone} />
        <Info label="Follow-up" value={lead.followUp} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</div>
        <div className="p-4 rounded-xl bg-secondary/40 border border-border text-sm">{lead.notes}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">AI Suggestions</div>
        <div className="space-y-2">
          {["Send case study from similar customer", "Book technical deep-dive in next 5 days", "Loop in solutions engineer Priya"].map(s => (
            <div key={s} className="flex items-start gap-2 text-sm p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Sparkles className="w-4 h-4 text-primary mt-0.5" /> {s}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Follow-up timeline</div>
        <div className="space-y-3">
          {["Email opened", "Discovery call completed", "Proposal sent", "Next: follow-up scheduled"].map((t, i) => (
            <div key={t} className="flex items-start gap-3 text-sm">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i < 3 ? "bg-primary" : "bg-muted"}`} />
              <div>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOM TOOLTIP FOR REVENUE TRAJECTORY ───────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const rev = payload.find(p => p.dataKey === "revenue")?.value || 0;
    const fore = payload.find(p => p.dataKey === "forecast")?.value || 0;
    const diff = rev - fore;
    const isPositive = diff >= 0;
    const pct = fore > 0 ? ((diff / fore) * 100).toFixed(1) : "0";

    return (
      <div className="bg-white/95 backdrop-blur-md border border-rose-100 rounded-2xl p-4 shadow-xl min-w-[200px] text-gray-800 transition-all z-[99999]">
        <p className="text-xs uppercase font-extrabold text-rose-700 tracking-wider mb-2.5">{label} 2026</p>
        <div className="space-y-2">
          {/* Actual */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Actual Revenue
            </span>
            <span className="font-extrabold text-gray-900">₹{rev.toFixed(1)}L</span>
          </div>
          {/* Forecast */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Forecast Target
            </span>
            <span className="font-semibold text-gray-600">₹{fore.toFixed(1)}L</span>
          </div>
          {/* Divider */}
          <div className="h-px bg-gray-100 my-2" />
          {/* Variance */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Variance</span>
            <span className={`font-bold flex items-center gap-1 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {isPositive ? "+" : ""}₹{diff.toFixed(1)}L ({isPositive ? "+" : ""}{pct}%)
            </span>
          </div>
        </div>
        {/* Performance Note */}
        <div className={`mt-3 text-[10px] font-bold text-center px-2 py-1 rounded-lg ${
          isPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50/50 text-rose-700 border border-rose-100"
        }`}>
          {isPositive ? "TARGET EXCEEDED" : "UNDER TARGET"}
        </div>
      </div>
    );
  }
  return null;
};

// ─── REDESIGNED REVENUE TRAJECTORY CARD ──────────────────────────────────────
function RevenueTrajectory({ data }) {
  const [viewMode, setViewMode] = useState("monthly");
  const isMobile = useIsMobile(768);
  const chartHeight = isMobile ? 168 : 250;
  const chartMargin = isMobile
    ? { top: 6, right: 4, left: -12, bottom: 2 }
    : { top: 15, right: 30, left: 10, bottom: 8 };

  // Raw metrics calculation
  const totalActual = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalForecast = data.reduce((sum, item) => sum + item.forecast, 0);
  const variance = totalActual - totalForecast;
  const variancePct = totalForecast > 0 ? (variance / totalForecast) * 100 : 0;

  // Average actuals (per month)
  const avgActual = totalActual / data.length;

  // MoM growth calculation
  let momSum = 0;
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].revenue;
    const curr = data[i].revenue;
    if (prev > 0) {
      momSum += ((curr - prev) / prev) * 100;
      count++;
    }
  }
  const avgGrowthPct = count > 0 ? momSum / count : 0;

  // Monthly data preparation
  const monthlyData = data.map(item => ({
    ...item,
    variance: item.revenue - item.forecast
  }));

  // Cumulative data preparation
  let runningActual = 0;
  let runningForecast = 0;
  const cumulativeData = data.map(item => {
    runningActual += item.revenue;
    runningForecast += item.forecast;
    return {
      month: item.month,
      revenue: runningActual,
      forecast: runningForecast,
      variance: runningActual - runningForecast
    };
  });

  const activeData = viewMode === "monthly" ? monthlyData : cumulativeData;
  const avgLineVal = viewMode === "monthly" ? avgActual : null;
  const finalTargetVal = viewMode === "cumulative" ? totalForecast : null;

  return (
    <div className={`${PANEL} p-3 sm:p-5`}>
      <SectionHead
        icon={BarChart3}
        title="Revenue Trajectory"
        sub={isMobile ? "Actual vs forecast" : "Last 12 months — actual vs forecast"}
        action={
          <div className="inline-flex p-0.5 sm:p-1 rounded-lg bg-slate-100 border border-slate-200">
            {["monthly", "cumulative"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition ${
                  viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode === "monthly" ? "Monthly" : "Cumulative"}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-5">
        <div className="rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 p-2 sm:p-3 flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[9px] uppercase font-semibold text-slate-400 tracking-wide truncate">
              {viewMode === "monthly" ? "Total Revenue" : "Cumulative YTD"}
            </p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">₹{totalActual.toFixed(1)}L</p>
          </div>
        </div>

        <div className="rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 p-2 sm:p-3 flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[9px] uppercase font-semibold text-slate-400 tracking-wide">Target</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">₹{totalForecast.toFixed(1)}L</p>
          </div>
        </div>

        <div className={`rounded-lg sm:rounded-xl border p-2 sm:p-3 flex items-center gap-2 ${
          variance >= 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
        }`}>
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center border shrink-0 ${
            variance >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
          }`}>
            {variance >= 0 ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[9px] uppercase font-semibold text-slate-400 tracking-wide">Variance</p>
            <p className={`text-xs sm:text-sm font-bold tabular-nums truncate ${variance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {variance >= 0 ? "+" : ""}₹{variance.toFixed(1)}L
            </p>
          </div>
        </div>

        <div className="rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 p-2 sm:p-3 flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[9px] uppercase font-semibold text-slate-400 tracking-wide">MoM Growth</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">{avgGrowthPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className={isMobile ? "w-full min-w-0" : "rev-scroll overflow-x-auto"}>
        <div style={isMobile ? { height: chartHeight, width: "100%" } : { minWidth: 400, height: chartHeight }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={activeData} margin={chartMargin}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.01}/>
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={isMobile ? 8 : 10}
                interval={isMobile ? 1 : 0}
                tick={{ dy: 4, fill: "#475569", fontWeight: 500, fontSize: isMobile ? 8 : 10 }}
                tickMargin={2}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={isMobile ? 8 : 10}
                width={isMobile ? 26 : 40}
                tickMargin={2}
                tickFormatter={v => (isMobile ? `${v}L` : `₹${v}L`)}
                tick={{ fill: "#475569", fontWeight: 500, fontSize: isMobile ? 8 : 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#fecdd3", strokeWidth: 1.5, strokeDasharray: "3 3" }} />
              

              {/* Delta bars */}
              <Bar dataKey="variance" radius={[3, 3, 0, 0]} barSize={isMobile ? 8 : 14}>
                {activeData.map((entry, index) => {
                  const isPositive = entry.variance >= 0;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isPositive ? "#10b981" : "#ef4444"}
                      fillOpacity={0.15}
                      stroke={isPositive ? "#059669" : "#dc2626"}
                      strokeOpacity={0.3}
                      strokeWidth={1}
                    />
                  );
                })}
              </Bar>

              {/* Forecast (dotted line) */}
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#3b82f6"
                strokeWidth={isMobile ? 1.5 : 2}
                strokeDasharray="5 5"
                fill="url(#forecastGrad)"
                name="Forecast"
              />

              {/* Actuals (solid area) */}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#e11d48"
                strokeWidth={isMobile ? 2 : 2.5}
                fill="url(#actualGrad)"
                name="Revenue"
                activeDot={{ r: isMobile ? 4 : 6, fill: "#e11d48", stroke: "#fff", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// ─── ROOT DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [lead,            setLead]           = useState(null);
  const { preset, bounds } = useDateRange();
  const { selectedService, setSelectedService } = useAdmin();
  const initialDash = hydrateDashboardCache();
  const [apiFilterData, setApiFilterData] = useState(initialDash?.filterData ?? null);
  const [customFilterRange, setCustomFilterRange] = useState(null);
  const [customRangeLoading, setCustomRangeLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(initialDash?.aiInsights ?? []);
  const [teamEmployees, setTeamEmployees] = useState(() => hydrateTeamCache());
  const [chartRevenue, setChartRevenue] = useState(initialDash?.revenueSeries ?? []);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [liveActivity, setLiveActivity] = useState(() => hydrateActivityCache());
  const [dashboardLoading, setDashboardLoading] = useState(!initialDash?.filterData);
  const [dashboardError, setDashboardError] = useState(null);

  const filterKey = preset === "custom" ? "custom" : preset;
  const mergedFilter = mergeFilterData(null, apiFilterData);
  const fd = preset === "custom"
    ? (customFilterRange || EMPTY_FILTER_RANGE)
    : (mergedFilter?.[filterKey] || EMPTY_FILTER_RANGE);

  const leaderboardData = useMemo(() => {
    if (fd?.leaderboard?.length) return fd.leaderboard.slice(0, 3);
    const fromTeam = buildLeaderboardFromEmployees(teamEmployees);
    if (fromTeam.length) return fromTeam;
    return [];
  }, [fd, teamEmployees]);

  const insightItems = aiInsights.length ? aiInsights : (fd.insights || []);
  const pipelineForecast = fd.kpis?.find((k) => k.label === "Pipeline Value")?.value || "₹0";
  const activityItems = liveActivity?.length ? liveActivity : (fd.activity || []);

  useEffect(() => {
    let cancelled = false;

    async function applyDashboardPayload(data) {
      if (!data || cancelled) return;
      if (data.filterData) setApiFilterData(data.filterData);
      if (Array.isArray(data.aiInsights)) setAiInsights(data.aiInsights);
      if (data.revenueSeries?.length) setChartRevenue(data.revenueSeries);
      else setChartRevenue([]);
      setDashboardError(null);
    }

    async function loadDashboardBundle() {
      if (!apiFilterData) setDashboardLoading(true);
      try {
        const data = await apiGet("/api/dashboard", { cacheTtl: ADMIN_DASH_CACHE_TTL });
        await applyDashboardPayload(data);
      } catch (err) {
        if (cancelled) return;
        const cached = readStaleCachedJson("/api/dashboard");
        if (cached?.filterData) {
          await applyDashboardPayload(cached);
        } else if (!apiFilterData) {
          setDashboardError(err?.message || "Could not load dashboard data");
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }

      try {
        const team = await apiGet("/api/team/employees", { cacheTtl: ADMIN_DASH_CACHE_TTL });
        if (!cancelled && team.success && team.employees?.length) {
          setTeamEmployees(team.employees);
        }
      } catch {
        if (!cancelled) {
          const cachedTeam = hydrateTeamCache();
          if (cachedTeam.length) setTeamEmployees(cachedTeam);
        }
      }

      try {
        const activity = await apiGet("/api/activity", { cacheTtl: ADMIN_DASH_CACHE_TTL });
        if (!cancelled && activity?.success && activity.activities?.length) {
          setLiveActivity(
            activity.activities.slice(0, 8).map((row) => ({
              text: row.user_name ? `${row.action} — ${row.user_name}` : row.action,
              createdAt: row.created_at,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          const cachedActivity = hydrateActivityCache();
          if (cachedActivity?.length) setLiveActivity(cachedActivity);
        }
      }
    }

    loadDashboardBundle();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (preset !== "custom") {
      setCustomFilterRange(null);
      setCustomRangeLoading(false);
      return;
    }
    if (!bounds?.start || !bounds?.end) {
      setCustomFilterRange(null);
      return;
    }

    let cancelled = false;
    setCustomRangeLoading(true);
    const params = buildPeriodQueryParams({
      preset: "custom",
      bounds,
    });
    params.set("range", "custom");

    apiGet(`/api/dashboard/filter-range?${params.toString()}`, { cacheTtl: ADMIN_DASH_CACHE_TTL })
      .then((data) => {
        if (cancelled || !data?.success) return;
        setCustomFilterRange({
          kpis: data.kpis || EMPTY_FILTER_RANGE.kpis,
          leaderboard: data.leaderboard || [],
          metrics: data.metrics || EMPTY_FILTER_RANGE.metrics,
          insights: data.insights || [],
          activity: data.activity || [],
        });
      })
      .catch(() => {
        if (!cancelled) setCustomFilterRange(null);
      })
      .finally(() => {
        if (!cancelled) setCustomRangeLoading(false);
      });

    return () => { cancelled = true; };
  }, [preset, bounds?.start, bounds?.end]);

  useEffect(() => {
    let cancelled = false;
    setPipelineLoading(true);
    const params = buildPeriodQueryParams({ preset, bounds, extra: { service: selectedService } });
    params.set("range", preset === "custom" ? "custom" : filterKey);
    apiGet(`/api/dashboard/pipeline-status?${params.toString()}`, { cacheTtl: ADMIN_DASH_CACHE_TTL })
      .then((data) => {
        if (!cancelled && data?.success) setPipelineStats(data);
      })
      .catch(() => {
        if (!cancelled) {
          const cached = readStaleCachedJson(`/api/dashboard/pipeline-status?${params.toString()}`);
          if (cached?.success) setPipelineStats(cached);
          else setPipelineStats({ success: true, ...buildEmptyPipelineGrid() });
        }
      })
      .finally(() => {
        if (!cancelled) setPipelineLoading(false);
      });
    return () => { cancelled = true; };
  }, [filterKey, preset, bounds?.start, bounds?.end, selectedService]);

  // Reset service filter when time filter changes
  useEffect(() => { setSelectedService("All Services"); }, [filterKey, preset]);

  const serviceBreakdownData = apiFilterData?.serviceBreakdown || null;
  const services = serviceBreakdownData?.[selectedService] || serviceBreakdownData?.["All Services"] || [];

  const totalRevenueCard = fd.kpis?.find(k => k.label === "Total Revenue" || k.label === "Revenue") || 
                           { label: "Total Revenue", value: "₹0", icon: "DollarSign" };
  const cashCollectedCard = fd.kpis?.find(k => k.label === "Cash Collected") || 
                            { label: "Cash Collected", value: "₹0", icon: "DollarSign" };
  const totalLeadsValue = fd.kpis?.find(k => k.label === "Total Leads")?.value || "0";
  const totalCallsValue = fd.kpis?.find(k => k.label === "Total Calls Made")?.value || "0";
  const qualifiedLeadsCard = fd.kpis?.find(k => k.label === "Qualified Leads") || 
                             { label: "Qualified Leads", value: "0", icon: "FileText" };
  const pipelineValueCard = fd.kpis?.find(k => k.label === "Pipeline Value") || 
                            { label: "Pipeline Value", value: "₹0", icon: "DollarSign" };
  const closingsValue = fd.kpis?.find(k => k.label === "Closings")?.value || "0";
  const kpiLoading = (dashboardLoading && !apiFilterData) || (preset === "custom" && customRangeLoading && !customFilterRange);

  const { stats: tenantCallStats } = useTenantCallyzerStats(
    preset === "custom" ? "month" : filterKey,
    Boolean(apiFilterData),
  );

  const parseKpiNumber = (value) => {
    const n = parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const resolvedMetrics = useMemo(() => {
    const base = fd?.metrics || { pickup: 0, qualification: 0, conversion: 0 };
    let pickup = Number(base.pickup) || 0;
    let qualification = Number(base.qualification) || 0;
    let conversion = Number(base.conversion) || 0;

    if (!pickup && tenantCallStats?.totalCalls) {
      pickup = Math.min(
        100,
        Math.round((Number(tenantCallStats.connectedCalls) / Number(tenantCallStats.totalCalls)) * 100),
      );
    }

    const totalLeads = parseKpiNumber(totalLeadsValue);
    const qualified = parseKpiNumber(qualifiedLeadsCard.value);
    const closings = parseKpiNumber(closingsValue);

    if (!qualification && totalLeads > 0 && qualified > 0) {
      qualification = Math.min(100, Math.round((qualified / totalLeads) * 100));
    }
    if (!conversion && totalLeads > 0 && closings > 0) {
      conversion = Math.min(100, Math.round((closings / totalLeads) * 100));
    }
    if (!conversion && pipelineStats?.overallConv) {
      conversion = Math.min(100, Number(pipelineStats.overallConv) || 0);
    }

    return { pickup, qualification, conversion };
  }, [
    fd?.metrics,
    tenantCallStats,
    totalLeadsValue,
    qualifiedLeadsCard.value,
    closingsValue,
    pipelineStats?.overallConv,
  ]);

  const finalKpis = [
    { label: "Total Revenue", value: totalRevenueCard.value, icon: "DollarSign", trendVal: totalRevenueCard.trendVal, sub: totalRevenueCard.sub },
    { label: "Cash Collected", value: cashCollectedCard.value, icon: "DollarSign", trendVal: cashCollectedCard.trendVal, sub: cashCollectedCard.sub },
    { label: "Total Leads", value: totalLeadsValue, icon: "Users" },
    { label: "Total Calls Made", value: totalCallsValue, icon: "Phone" },
    { label: "Qualified Leads", value: qualifiedLeadsCard.value, icon: "FileText", trendVal: qualifiedLeadsCard.trendVal, sub: qualifiedLeadsCard.sub },
    { label: "Pipeline Value", value: pipelineValueCard.value, icon: "DollarSign", trendVal: pipelineValueCard.trendVal, sub: pipelineValueCard.sub },
    { label: "Closings", value: closingsValue, icon: "Trophy" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 page-shell min-w-0">

      {dashboardError && !apiFilterData && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm font-semibold text-rose-800">{dashboardError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#be123c] text-white text-xs font-bold hover:bg-[#a20f32]"
          >
            Retry load
          </button>
        </div>
      )}

      <KPICardsRow kpiData={kpiLoading ? EMPTY_FILTER_RANGE.kpis : finalKpis} filterKey={filterKey} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(0,_36%)] gap-3 sm:gap-4 items-start min-w-0">

        <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
          <LeaderBoard employees={leaderboardData} />

          <LeadPipeline
            pipelineStats={pipelineStats}
            filterKey={filterKey}
            selectedService={selectedService}
            onServiceChange={setSelectedService}
            loading={pipelineLoading}
          />

          <RevenueTrajectory data={chartRevenue} />
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 min-w-0 w-full">
          <AIInsightsPanel insights={insightItems} filterKey={filterKey} forecastValue={pipelineForecast} />
          <ImpMetrics metrics={resolvedMetrics} filterKey={filterKey} />
          <RecentActivityPanel items={activityItems} filterKey={filterKey} />
        </div>
      </div>


      {/* ── DRAWER ───────────────────────────────────────────────────────── */}
      <Drawer open={!!lead} onClose={() => setLead(null)} title={lead?.company || ""}>
        {lead && <LeadDrawerContent lead={lead} />}
      </Drawer>
    </div>
  );
}