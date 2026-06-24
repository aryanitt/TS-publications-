import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Users, Flame, CheckCircle2, ClipboardList, TrendingUp,
  Phone, Calendar, ArrowRight, Zap, Target, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LabelList } from "recharts";
import { Badge } from "../../components/Primitives.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import {
  EMP_PIPELINE, EMP_AGENDA, EMP_SOURCE_CHART, EMP_ACTIVITY, EMP_LEADS,
  LEAD_STATUS_LABELS,
} from "../../data/employeeMock.js";
import { AvatarCircle, EmployeeDoodleAvatar } from "../components/EmpUI.jsx";
import useIsMobile from "../../lib/useIsMobile.js";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../../lib/segmentPills.js";

const PANEL = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

const STAT_CARDS = [
  { label: "Total Leads", value: "248", change: "↑ 12%", icon: Users, iconTone: "bg-sky-50 text-sky-600 border-sky-100", link: "/employee/leads" },
  { label: "Hot Leads", value: "42", change: "↑ +5", icon: Flame, iconTone: "bg-orange-50 text-orange-600 border-orange-100", filter: "hot" },
  { label: "Converted", value: "24", change: "24.2% rate", icon: CheckCircle2, iconTone: "bg-emerald-50 text-emerald-600 border-emerald-100", filter: "converted" },
  { label: "Tasks Due", value: "8", change: "3 done", icon: ClipboardList, iconTone: "bg-violet-50 text-violet-600 border-violet-100", link: "/employee/tasks" },
];

const PIPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "hot", label: "Hot", icon: Flame },
  { id: "warm", label: "Warm" },
  { id: "cold", label: "Cold" },
];

const PERIODS = ["Today", "This Week", "This Month"];

function KpiCard({ label, value, change, icon: Icon, iconTone, className = "" }) {
  return (
    <article className={`${PANEL} p-2.5 sm:p-4 flex flex-col justify-between min-h-[88px] sm:min-h-[100px] hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0">
          <p className="text-[8px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 tabular-nums leading-none">{value}</p>
        </div>
        {Icon && (
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl grid place-items-center shrink-0 border ${iconTone}`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>
      {change && (
        <p className="text-[9px] sm:text-[10px] font-semibold text-emerald-600 mt-2 sm:mt-3 leading-tight">
          {change}
          <span className="hidden sm:inline text-slate-400 font-medium"> vs last period</span>
        </p>
      )}
    </article>
  );
}

function SectionHead({ icon: Icon, title, sub, action, stackAction }) {
  return (
    <div className={`flex ${stackAction ? "flex-col sm:flex-row" : ""} items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-4`}>
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 grid place-items-center shrink-0">
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-slate-900 text-xs sm:text-sm">{title}</h3>
          {sub && <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">{sub}</p>}
        </div>
      </div>
      {action && (
        <div className={`${stackAction ? "w-full sm:w-auto overflow-x-auto scrollbar-none" : ""} shrink-0`}>
          {action}
        </div>
      )}
    </div>
  );
}

export default function EmployeeDashboard() {
  const { employee } = useEmployee();
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);
  const [period, setPeriod] = useState("Today");
  const [pipeFilter, setPipeFilter] = useState("all");
  const [agenda, setAgenda] = useState(EMP_AGENDA);

  const filteredPipeLeads = useMemo(() => {
    if (pipeFilter === "all") return null;
    return EMP_LEADS.filter((l) => l.status === pipeFilter);
  }, [pipeFilter]);

  const callPct = Math.round((employee.callsDone / employee.callsTarget) * 100);
  const pendingAgenda = agenda.filter((a) => !a.done).length;
  const pipelineTotal = EMP_PIPELINE.reduce((s, p) => s + p.count, 0);
  const convertedCount = EMP_PIPELINE.find((p) => p.label === "Converted")?.count ?? 0;

  const markAgendaDone = (idx) => {
    setAgenda((prev) => prev.map((a, i) => (i === idx ? { ...a, done: true } : a)));
    toast.success("Marked done");
  };

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: isMobile ? "short" : "long",
    day: "numeric",
    month: "short",
  });

  const pipeChartHeight = isMobile ? 156 : 220;
  const pipeFilters = (
    <div className={`${SEGMENT_WRAP} max-w-full`}>
      {PIPE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => setPipeFilter(f.id)}
          className={`flex items-center gap-0.5 sm:gap-1 ${SEGMENT_BTN} ${
            pipeFilter === f.id ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
          }`}
        >
          {f.icon && <f.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
          {f.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-3 sm:space-y-5 page-shell min-w-0 animate-fade-in">
      {/* Header */}
      <div className={`${PANEL} p-3 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2.5 sm:gap-4 min-w-0">
            <EmployeeDoodleAvatar size={isMobile ? 40 : 52} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                {period === "This Week" ? "Week" : period === "This Month" ? "Month" : period} · {dateLabel}
              </p>
              <h1 className="font-display text-base sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5 leading-tight">
                Good morning, {employee.name.split(" ")[0]}
              </h1>
              <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none -mx-0.5 px-0.5 pb-0.5">
                {[
                  { label: "8 hot follow-ups", to: "/employee/follow-ups" },
                  { label: "3 meetings", to: "/employee/meetings" },
                  { label: `${pendingAgenda} agenda`, to: null },
                ].map((chip) => (
                  chip.to ? (
                    <Link
                      key={chip.label}
                      to={chip.to}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-slate-50 border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition shrink-0"
                    >
                      {chip.label}
                      <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-50" />
                    </Link>
                  ) : (
                    <span key={chip.label} className="inline-flex px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-slate-50 border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-600 shrink-0">
                      {chip.label}
                    </span>
                  )
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:shrink-0">
            <div className={`${SEGMENT_WRAP} flex-1 sm:flex-none min-w-0`}>
              {PERIODS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPeriod(d)}
                  className={`${SEGMENT_BTN} ${
                    period === d ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                  }`}
                >
                  <span className="sm:hidden">{d === "This Week" ? "Week" : d === "This Month" ? "Month" : d}</span>
                  <span className="hidden sm:inline">{d}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate("/employee/leads?action=add")}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-700 transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {STAT_CARDS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              if (s.link) navigate(s.link);
              else if (s.filter) setPipeFilter(s.filter);
            }}
            className="text-left w-full min-w-0"
          >
            <KpiCard {...s} />
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 sm:gap-4 md:gap-5 items-start">
        <div className="space-y-3 sm:space-y-4 md:space-y-5 min-w-0">
          {/* Pipeline */}
          <div className={`${PANEL} p-3 sm:p-4 md:p-5 min-w-0 overflow-hidden`}>
            <SectionHead
              icon={Target}
              title="Lead Pipeline"
              sub={isMobile ? "Stage breakdown" : "Stage-wise breakdown"}
              stackAction
              action={pipeFilters}
            />

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {[
                { label: "In pipeline", val: pipelineTotal },
                { label: "Converted", val: convertedCount },
                { label: "Conv. rate", val: "9.7%" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 px-2 py-1.5 sm:px-3 sm:py-2 text-center min-w-0">
                  <p className="text-sm sm:text-base font-black text-slate-900 tabular-nums">{s.val}</p>
                  <p className="text-[8px] sm:text-[10px] font-medium text-slate-500 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="w-full min-w-0" style={{ height: pipeChartHeight }}>
              <ResponsiveContainer width="100%" height={pipeChartHeight}>
                <BarChart
                  data={EMP_PIPELINE}
                  layout="vertical"
                  margin={{ top: 2, right: isMobile ? 18 : 28, left: 0, bottom: 2 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="label"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    fontSize={isMobile ? 9 : 11}
                    fontWeight={600}
                    tick={{ fill: "#64748b" }}
                    width={isMobile ? 58 : 84}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      fontSize: 11,
                      padding: "6px 10px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                    formatter={(val) => [`${val} leads`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={isMobile ? 11 : 16}>
                    {EMP_PIPELINE.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} fillOpacity={0.85} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, fill: "#475569" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {pipeFilter !== "all" && filteredPipeLeads && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-900">{LEAD_STATUS_LABELS[pipeFilter]} Leads</h4>
                  <Link to={`/employee/leads?filter=${pipeFilter}`} className="text-[10px] sm:text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-0.5">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {filteredPipeLeads.slice(0, 4).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => navigate("/employee/leads")}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2 sm:pr-3 py-0.5 sm:py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition text-left max-w-full"
                    >
                      <AvatarCircle initials={l.av} color={l.color} size={isMobile ? 20 : 24} />
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 max-w-[72px] sm:max-w-[90px] truncate">{l.name}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">{l.budget}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sources + Activity */}
          <div className={`${PANEL} overflow-hidden min-w-0`}>
            <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-slate-100">
              <div className="p-3 sm:p-4 md:p-5">
                <SectionHead icon={TrendingUp} title="Lead Sources" sub={isMobile ? "Top channels" : "Top channels this month"} />
                <div className="flex flex-col items-center py-1 sm:py-2">
                  <div className={`relative ${isMobile ? "w-[112px] h-[112px]" : "w-[148px] h-[148px]"}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={EMP_SOURCE_CHART.map((s) => ({ name: s.label, value: s.pct, color: s.color }))}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 32 : 44}
                          outerRadius={isMobile ? 50 : 68}
                          paddingAngle={3}
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {EMP_SOURCE_CHART.map((s) => (
                            <Cell key={s.label} fill={s.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val, _n, props) => [`${val}%`, props.payload.name]}
                          contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`${isMobile ? "text-base" : "text-xl"} font-black text-slate-900`}>100%</span>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Total</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1 mt-3 sm:mt-4 w-full max-w-[240px]">
                    {EMP_SOURCE_CHART.map((s) => (
                      <div key={s.label} className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-slate-600 min-w-0">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="truncate flex-1">{s.label}</span>
                        <span className="font-bold text-slate-800 shrink-0">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 md:p-5 border-t md:border-t-0 border-slate-100">
                <SectionHead
                  icon={Zap}
                  title="Recent Activity"
                  sub="Last 24 hours"
                  action={<Badge tone="muted">Live</Badge>}
                />
                <ul className="space-y-1 sm:space-y-1.5">
                  {EMP_ACTIVITY.map((a) => (
                    <li key={a.text}>
                      <div className="flex items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-slate-50 transition">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg grid place-items-center text-xs sm:text-sm shrink-0 bg-slate-100 border border-slate-200">
                          {a.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 leading-snug line-clamp-2">{a.text}</p>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{a.time}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Agenda sidebar */}
        <div className="space-y-2 sm:space-y-3 xl:sticky xl:top-24 min-w-0">
          <div className={`${PANEL} p-3 sm:p-4 md:p-5`}>
            <SectionHead
              icon={Calendar}
              title="Today's Agenda"
              sub={`${pendingAgenda} remaining`}
              action={(
                <Link to="/employee/meetings" className="text-[10px] sm:text-[11px] font-semibold text-slate-600 hover:text-slate-900 shrink-0">
                  + Meeting
                </Link>
              )}
            />

            <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 mb-3 sm:mb-4">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="#f43f5e" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${callPct} 100`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-none">
                  {employee.callsDone}<span className="text-xs sm:text-sm text-slate-400 font-semibold">/{employee.callsTarget}</span>
                </p>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 leading-tight">
                  Calls today · {callPct}% of target
                </p>
              </div>
            </div>

            <div className={`space-y-1.5 sm:space-y-2 ${isMobile ? "max-h-[240px]" : "max-h-[340px]"} overflow-y-auto pr-0.5`}>
              {agenda.map((a, i) => (
                <div
                  key={a.time + a.title}
                  className={`rounded-lg sm:rounded-xl border p-2.5 sm:p-3 transition ${
                    a.done
                      ? "border-slate-100 bg-slate-50/50 opacity-60"
                      : a.hot
                        ? "border-rose-100 bg-rose-50/30"
                        : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tabular-nums">{a.time}</span>
                        {a.hot && !a.done && <Badge tone="danger">Hot</Badge>}
                        {a.done && <Badge tone="success">Done</Badge>}
                      </div>
                      <p className={`text-[11px] sm:text-xs font-bold mt-0.5 sm:mt-1 leading-snug ${a.done ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {a.title}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 line-clamp-1">{a.sub}</p>
                    </div>
                    {!a.done && (
                      <button
                        type="button"
                        onClick={() => markAgendaDone(i)}
                        className="shrink-0 text-[9px] sm:text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-emerald-100 hover:bg-emerald-100 transition"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {[
              { label: "Follow-ups", to: "/employee/follow-ups", icon: Zap, count: 8 },
              { label: "All Leads", to: "/employee/leads", icon: Target, count: 24 },
            ].map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className={`${PANEL} flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 hover:border-slate-300 hover:shadow-sm transition group min-w-0`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-slate-50 border border-slate-200 grid place-items-center group-hover:bg-slate-100 transition shrink-0">
                  <q.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 truncate">{q.label}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">{q.count} items</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
