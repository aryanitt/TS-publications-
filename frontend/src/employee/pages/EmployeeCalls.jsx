import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle, CalendarClock, CheckCircle2, Clock, Mail, MessageCircle,
  Pause, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Play, RotateCcw,
  Search, Star, TrendingUp, User, Zap, Sparkles,
} from "lucide-react";
import { GlassCard, StatCard, Badge } from "../../components/Primitives.jsx";
import {
  computeCallStatsFromCalls,
  filterCallsForPeriod,
  LEAD_STATUS_LABELS,
  resolveEmployeeCallType,
} from "../../data/employeeMock.js";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import CallyzerStatsPanel from "../../components/CallyzerStatsPanel.jsx";
import { useCallyzerStats } from "../../lib/useCallyzerStats.js";
import {
  AvatarCircle, BtnPrimary, BtnSecondary, EmpEmptyState, LeadStatusBadge,
} from "../components/EmpUI.jsx";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../../lib/segmentPills.js";

const PERIOD_LABEL = { today: "Today", week: "This Week", month: "This Month" };

const TYPE_META = {
  in: { icon: PhoneIncoming, label: "Inbound", tone: "success", bg: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  out: { icon: PhoneOutgoing, label: "Outbound", tone: "primary", bg: "bg-rose-50 text-rose-600 border-rose-100" },
  miss: { icon: PhoneMissed, label: "Missed", tone: "warning", bg: "bg-amber-50 text-amber-700 border-amber-100" },
};

const ACTIVITY_ICON = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  meeting: CalendarClock,
  note: User,
  proposal: CheckCircle2,
};

function useRingOffset(pct) {
  const circ = 100;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ * (1 - pct)), 100);
    return () => clearTimeout(t);
  }, [pct]);
  return offset;
}

function MetricRingChart({ pct, color, sizeClass = "w-10 h-10 sm:w-14 sm:h-14", labelClass = "text-[9px] sm:text-[11px]" }) {
  const offset = useRingOffset(pct);

  return (
    <div className={`relative shrink-0 mx-auto sm:mx-0 ${sizeClass}`}>
      <svg width="100%" height="100%" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r="22" fill="none" stroke="#ffe4e6" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r="22"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={100}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-[1.2s] ease-out"
        />
      </svg>
      <div className={`absolute inset-0 grid place-items-center font-black ${labelClass}`} style={{ color }}>
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

function RingMini({ pct, color, label, shortLabel }) {
  return (
    <div className="flex flex-col items-center text-center gap-1 sm:flex-row sm:items-center sm:text-left sm:gap-3 min-w-0">
      <MetricRingChart pct={pct} color={color} />
      <div className="min-w-0 w-full">
        <p className="text-[8px] sm:text-xs font-bold text-slate-900 leading-tight">
          <span className="sm:hidden">{shortLabel || label}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
        <p className="hidden sm:block text-[10px] text-slate-500 mt-0.5">Target benchmark</p>
      </div>
    </div>
  );
}

function CallMetricCard({ pct, color, label, shortLabel, footer, accentRgb }) {
  return (
    <GlassCard className="p-2 sm:p-4 min-w-0 lg:p-0 lg:overflow-hidden lg:relative lg:flex lg:flex-col">
      {/* Mobile / tablet — unchanged compact layout */}
      <div className="lg:hidden">
        <RingMini pct={pct} color={color} label={label} shortLabel={shortLabel} />
        <p className="hidden sm:block text-[10px] text-slate-500 mt-3 font-medium">{footer}</p>
      </div>

      {/* Web — compact horizontal card with pinned footer */}
      <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:min-h-[108px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(ellipse 120% 80% at 100% 100%, rgba(${accentRgb}, 0.08) 0%, transparent 55%), linear-gradient(180deg, #fffafa 0%, #ffffff 100%)`,
          }}
        />
        <div className="relative flex items-center gap-3.5 px-4 pt-3.5 pb-3 flex-1 min-h-0">
          <MetricRingChart pct={pct} color={color} sizeClass="w-[62px] h-[62px]" labelClass="text-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 leading-tight">{label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Target benchmark</p>
          </div>
        </div>
        <p className="relative shrink-0 px-4 py-2 border-t border-rose-100/80 text-[11px] text-slate-500 font-medium bg-white/70">
          {footer}
        </p>
      </div>
    </GlassCard>
  );
}

function CallLogItem({ call, active, onSelect }) {
  const callType = resolveEmployeeCallType(call);
  const meta = TYPE_META[callType] || TYPE_META.out;
  const Icon = meta.icon;
  const timeOnly = call.date?.includes("Today")
    ? call.date.replace("Today ", "")
    : call.date?.split(",")?.pop()?.trim() || call.date;

  return (
    <button
      type="button"
      onClick={() => onSelect(call)}
      className={`w-full text-left border transition-all duration-200 min-w-0 ${
        active
          ? "border-rose-300 bg-rose-50/60 shadow-[0_4px_16px_rgba(244,63,94,0.1)] ring-1 ring-rose-100"
          : "border-rose-100/80 bg-white hover:border-rose-200 hover:bg-rose-50/30"
      } p-2 rounded-lg sm:p-4 sm:rounded-xl`}
    >
      {/* Mobile — compact row (unchanged) */}
      <div className="flex items-center gap-2 min-w-0 sm:hidden">
        <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 border ${meta.bg}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{call.name}</p>
              <p className="text-[10px] text-slate-500 truncate leading-tight">{call.company}</p>
            </div>
            <span className="text-[11px] font-black text-slate-900 tabular-nums shrink-0">{call.duration}</span>
          </div>
          <div className="flex items-center gap-1 mt-1 min-w-0">
            <span className="inline-flex max-w-[38%] shrink-0">
              <span className={`text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border truncate block ${meta.bg}`}>
                {call.outcome}
              </span>
            </span>
            {call.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 shrink-0">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {call.rating}
              </span>
            )}
            {call.hasRec && (
              <span className="text-[7px] font-bold text-violet-700 bg-violet-50 px-1 py-0.5 rounded border border-violet-100 shrink-0">
                REC
              </span>
            )}
            <span className="text-[9px] font-semibold text-slate-400 truncate ml-auto shrink-0 min-w-0">
              {timeOnly}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop / web — original card layout */}
      <div className="hidden sm:flex items-start gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border ${meta.bg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate leading-tight">{call.name}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{call.company}</p>
            </div>
            <span className="text-sm font-black text-slate-900 tabular-nums shrink-0">{call.duration}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={meta.tone}>{call.outcome}</Badge>
            {call.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {call.rating}
              </span>
            )}
            {call.hasRec && (
              <span className="text-[9px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                REC
              </span>
            )}
            <span className="text-[10px] font-semibold text-slate-400 ml-auto">{call.date}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function EmployeeCalls() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const period = searchParams.get("period") || "today";
  const { calls: contextCalls = [], employee } = useEmployee();
  const { stats: callyzerStats, loading: callyzerLoading, configured: callyzerConfigured, message: callyzerMessage } =
    useCallyzerStats(employee?.id, period, Boolean(employee?.id));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const stats = useMemo(() => {
    if (callyzerStats) {
      return {
        dials: callyzerStats.totalCalls,
        connected: callyzerStats.connectedCalls,
        missed: callyzerStats.missedCalls,
        pickupRate: callyzerStats.totalCalls
          ? Math.round((callyzerStats.connectedCalls / callyzerStats.totalCalls) * 100)
          : 0,
        avgDuration: callyzerStats.totalDuration,
        totalTalk: callyzerStats.workingHours,
        hotLeads: 0,
        callbacks: callyzerStats.notPickupByClient,
        quality: callyzerStats.totalCalls
          ? Math.round((callyzerStats.connectedCalls / callyzerStats.totalCalls) * 100)
          : 0,
        missRate: callyzerStats.totalCalls
          ? Math.round((callyzerStats.missedCalls / callyzerStats.totalCalls) * 100)
          : 0,
      };
    }
    return computeCallStatsFromCalls(contextCalls, period);
  }, [callyzerStats, contextCalls, period]);

  const calls = useMemo(() => {
    let list = filterCallsForPeriod(contextCalls, period);

    if (typeFilter !== "all") list = list.filter((c) => resolveEmployeeCallType(c) === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.outcome.toLowerCase().includes(q) ||
          (c.note && c.note.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [contextCalls, period, typeFilter, search]);

  return (
    <div className="space-y-3 sm:space-y-4 page-shell min-w-0 animate-fade-in">
      {callyzerConfigured && (
        <CallyzerStatsPanel
          stats={callyzerStats}
          loading={callyzerLoading}
          configured={callyzerConfigured}
          message={callyzerMessage}
          subtitle={`${PERIOD_LABEL[period] || period} · from Callyzer`}
          compact
        />
      )}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard compact label="Total Dials" value={String(stats.dials)} icon={Phone} tone="primary" change={`${stats.connected} connected`} sub="" />
        <StatCard compact label="Pickup Rate" value={`${stats.pickupRate}%`} icon={TrendingUp} tone="success" change={`${stats.missed} missed`} changeTone="warning" sub="" />
        <StatCard compact label="Avg Duration" value={stats.avgDuration} icon={Clock} tone="warning" change={stats.totalTalk} sub="" />
        <StatCard compact label="Hot Leads" value={String(stats.hotLeads)} icon={Zap} tone="danger" change={`${stats.callbacks} callbacks set`} sub="" />
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:gap-4 lg:items-stretch">
        <CallMetricCard
          pct={stats.pickupRate / 100}
          color="#e11d48"
          label="Pickup Rate"
          shortLabel="Pickup"
          accentRgb="225,29,72"
          footer={`${stats.connected} picked / ${stats.dials} dialed · ${PERIOD_LABEL[period]}`}
        />
        <CallMetricCard
          pct={stats.quality / 100}
          color="#10b981"
          label="Quality Score"
          shortLabel="Quality"
          accentRgb="16,185,129"
          footer={`Avg ${stats.avgDuration} · ${stats.quality}% quality`}
        />
        <CallMetricCard
          pct={stats.missRate / 100}
          color="#f59e0b"
          label="Miss Rate"
          shortLabel="Miss"
          accentRgb="245,158,11"
          footer={`${stats.missed} missed · ${stats.callbacks} re-attempted`}
        />
      </div>

      <GlassCard className="p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className={SEGMENT_WRAP}>
            {[
              { id: "all", label: "All" },
              { id: "out", label: "Outbound" },
              { id: "in", label: "Inbound" },
              { id: "miss", label: "Missed" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTypeFilter(id)}
                className={`${SEGMENT_BTN} ${
                  typeFilter === id ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search calls, leads, outcomes…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-rose-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition"
            />
          </div>
        </div>
        <p className="text-[10px] font-semibold text-slate-400 mt-2 sm:hidden">
          {PERIOD_LABEL[period]} · {calls.length} calls
        </p>
        <p className="text-[11px] font-semibold text-slate-400 mt-2 hidden sm:block">
          {PERIOD_LABEL[period]} · {calls.length} calls · {stats.callbacks} callbacks scheduled
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 gap-3">
        <GlassCard className="p-2.5 sm:p-5 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-4 shrink-0 px-0.5">
            <h3 className="font-display font-bold text-slate-900 text-xs sm:text-base">Call Log</h3>
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[9px] sm:text-[11px] font-bold tabular-nums shrink-0">
              {calls.length}
            </span>
          </div>
          {calls.length === 0 ? (
            <EmpEmptyState icon="📞" title="No calls in this period" subtitle="Try a different filter or time range" />
          ) : (
            <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 max-h-none sm:max-h-[640px] sm:overflow-y-auto sm:overscroll-contain sm:scrollbar-thin sm:pr-1">
              {calls.map((c) => (
                <CallLogItem
                  key={c.id}
                  call={c}
                  active={false}
                  onSelect={(call) => navigate(`/employee/call-detail?id=${call.id}`)}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="hidden sm:grid sm:grid-cols-4 gap-2">
        {[
          { val: stats.dials, lbl: "Dials", color: "#e11d48", icon: Phone },
          { val: stats.connected, lbl: "Connected", color: "#10b981", icon: CheckCircle2 },
          { val: stats.missed, lbl: "Missed", color: "#f59e0b", icon: AlertCircle },
          { val: stats.callbacks, lbl: "Callbacks", color: "#7c3aed", icon: RotateCcw },
        ].map(({ val, lbl, color, icon: Icon }) => (
          <GlassCard key={lbl} className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xl font-black tabular-nums" style={{ color }}>{val}</p>
              <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${color}15`, color }}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500">{lbl}</p>
            <div className="h-1 rounded-full bg-rose-50 mt-1.5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (val / stats.dials) * 100)}%`, background: color }} />
            </div>
          </GlassCard>
        ))}
      </div>

      {stats.dials > 0 && (
      <GlassCard className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-sm">Your Call Performance</h3>
            <p className="text-[11px] text-slate-500">{PERIOD_LABEL[period]} · your stats</p>
          </div>
          <Badge tone="muted">1 rep</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(() => {
            const callsCount = stats.dials;
            const pct = stats.pickupRate;
            const scTone = stats.quality >= 85 ? "success" : stats.quality >= 70 ? "warning" : "danger";
            const initials = String(employee?.name || "You").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-rose-100 bg-white/80">
                <AvatarCircle initials={initials} color="#be123c" size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-800 truncate">{employee?.name || "You"}</span>
                    <Badge tone={scTone}>{stats.quality}</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-rose-50 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-rose-500 to-rose-600" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mt-1">{callsCount} calls · {pct}% pickup rate</p>
                </div>
              </div>
            );
          })()}
        </div>
      </GlassCard>
      )}
    </div>
  );
}
