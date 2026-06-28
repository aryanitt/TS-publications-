import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "../hooks/use-mobile.tsx";
import {
  Users, Plus, Search, CheckCircle2, X,
  Target, Flame, Pause, Play, PhoneCall,
  GripVertical, ChevronDown, ChevronUp, History, Layers,
  Shuffle, Zap,
  } from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import AddLeadDrawer from "../components/AddLeadDrawer.jsx";
import LeadDetailDrawer from "../components/leads/LeadDetailDrawer.jsx";
import { GlassCard, StatCard, Badge, Drawer, SectionHeader } from "../components/Primitives.jsx";
import { apiGet, apiPost, readCachedJson, invalidateCache } from "../lib/api.js";
import { getAdminCrmHeaders } from "../lib/crmContext.js";
import { apiLeadToAdmin, apiEmployeeToAdmin, unwrapApiData } from "../lib/leadSync.js";
import {
  getAssignmentState, assignLead, bulkAssign,
  toggleEmployeeReceiving, setDistributionMode, setAutoAssign,
  initRoundRobinOrder, autoAssignUnassigned, runDistributionNow, computeWorkload,
  workloadStatus, getAssignmentForLead, getLeadId, normalizeSource,
  isConverted, persistAssignmentState,
} from "../lib/leadAssignment.js";
import {
  dummyLeads,
  dummyEmployees,
  resolveDemoLeads,
  resolveDemoEmployees,
  createDemoAssignmentState,
} from "../data/leadManagementMock.js";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../lib/segmentPills.js";
import { PERIOD_PILL_BTN, PERIOD_PILL_INACTIVE } from "../lib/dateRange.js";

const SOURCE_LABELS = {
  meta_ads: { label: "Meta Ads", tone: "info", color: "#2563eb" },
  google_ads: { label: "Google Ads", tone: "warning", color: "#d97706" },
  website: { label: "Website", tone: "success", color: "#16a34a" },
  whatsapp: { label: "WhatsApp", tone: "success", color: "#059669" },
  manual: { label: "Manual", tone: "muted", color: "#64748b" },
  api: { label: "API", tone: "primary", color: "#be123c" },
  n8n: { label: "N8N", tone: "info", color: "#7c3aed" },
};

const CHART_COLORS = ["#f43f5e", "#fb7185", "#fda4af", "#be123c", "#9f1239", "#881337"];

const cardBase = {
  background: "#fff",
  border: "1px solid #fecdd3",
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,.04)",
};

/** Right panel: visible employee cards before scroll. */
const VISIBLE_EMPLOYEE_COUNT = 2;
const EMPLOYEE_CARD_HEIGHT_PX = 190;
const EMPLOYEE_LIST_VIEWPORT_PX = VISIBLE_EMPLOYEE_COUNT * EMPLOYEE_CARD_HEIGHT_PX + (VISIBLE_EMPLOYEE_COUNT - 1) * 10;

function SourceBadge({ lead, compact = false }) {
  const key = normalizeSource(lead.source || lead.form_name);
  const cfg = SOURCE_LABELS[key] || { label: lead.source || "Other", tone: "muted" };
  return (
    <Badge tone={cfg.tone}>
      <span className={compact ? "text-[9px] normal-case tracking-normal" : undefined}>{cfg.label}</span>
    </Badge>
  );
}

function EmployeeCard({ emp, stats, utilPct, status, paused, onTogglePause, onDrop, dragOver }) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDrop?.(true); }}
      onDragLeave={() => onDrop?.(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(false, emp);
      }}
      className={`rounded-xl border p-3 transition-all shrink-0 ${dragOver ? "border-rose-500 bg-rose-50 shadow-md scale-[1.01]" : "border-rose-100 bg-white hover:border-rose-300"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-primary grid place-items-center text-[10px] font-bold text-white shrink-0">
            {(emp.name || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{emp.name}</p>
            <p className="text-[9px] text-slate-500 truncate">{emp.role || emp.department || "Sales"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onTogglePause(emp.id)}
          title={paused ? "Resume receiving" : "Pause receiving"}
          className={`w-7 h-7 rounded-md grid place-items-center shrink-0 transition ${paused ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: status.bg, color: status.color }}
        >
          <span className="w-1 h-1 rounded-full" style={{ background: status.dot }} />
          {status.label}
    </span>
        {paused && <Badge tone="warning"><span className="text-[9px]">Paused</span></Badge>}
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-center mb-2">
        {[
          ["Assigned", stats.assigned],
          ["Active", stats.active],
          ["Converted", stats.converted],
          ["Follow-ups", stats.followUps],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md bg-rose-50/50 py-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase">{l}</p>
            <p className="text-xs font-black text-slate-800">{v}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-[9px] font-bold mb-0.5">
          <span className="text-slate-500">Capacity</span>
          <span style={{ color: status.color }}>{utilPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-rose-50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(utilPct, 100)}%`,
              background: status.dot,
            }}
          />
        </div>
    </div>
    </div>
  );
}

export default function Leads() {
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState(() => {
    const cached = readCachedJson("/api/sales/leads");
    if (cached?.success && cached.leads?.length) return cached.leads;
    return dummyLeads;
  });
  const [employees, setEmployees] = useState(dummyEmployees);
  const [assignState, setAssignState] = useState(() => {
    const existing = getAssignmentState();
    if (Object.keys(existing.assignments || {}).length > 0) return existing;
    return createDemoAssignmentState(existing, dummyEmployees, dummyLeads);
  });
  const [loading, setLoading] = useState(() => {
    const cached = readCachedJson("/api/sales/leads");
    return !(cached?.success && cached.leads?.length);
  });
const [addOpen, setAddOpen] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
const [toast, setToast] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [assignFilter, setAssignFilter] = useState("All");
  const [selected, setSelected] = useState(new Set());
  const [dragLeadId, setDragLeadId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir] = useState("desc");

const showToast = (message, type = "success") => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 3000);
};

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput), 250);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    Promise.all([
      apiGet("/api/v1/leads?limit=200", { headers: getAdminCrmHeaders(), skipCache: true, cacheTtl: 0 })
        .then((res) => {
          const items = unwrapApiData(res);
          if (items.length) return { success: true, leads: items.map(apiLeadToAdmin), fromV1: true };
          throw new Error("empty");
        })
        .catch(() => apiGet("/api/sales/leads").catch(() => ({ success: false, leads: [] }))),
      apiGet("/api/v1/employees", { headers: getAdminCrmHeaders(), skipCache: true, cacheTtl: 0 })
        .then((res) => {
          const items = unwrapApiData(res);
          if (items.length) return { success: true, employees: items.map(apiEmployeeToAdmin) };
          throw new Error("empty");
        })
        .catch(() => apiGet("/api/team/employees").catch(() => ({ success: false, employees: [] }))),
    ])
      .then(([leadData, empData]) => {
        const leadList = resolveDemoLeads(leadData.success ? leadData.leads : []);
        const empList = resolveDemoEmployees(empData.success ? empData.employees : []);
        const isDemo = !leadData.success || !leadData.leads?.length;

        setLeads(leadList);
        setEmployees(empList);

        setAssignState((prev) => {
          const hasAssignments = Object.keys(prev.assignments || {}).length > 0;
          let s = prev.distribution?.roundRobinOrder?.length
            ? prev
            : initRoundRobinOrder(prev, empList);

          if (isDemo && !hasAssignments) {
            s = createDemoAssignmentState(s, empList, leadList);
            persistAssignmentState(s);
          } else if (!isDemo && !leadData.fromV1) {
            s = autoAssignUnassigned(s, empList, leadList);
          }
          return s;
        });
      })
      .catch(() => {
        setLeads(dummyLeads);
        setEmployees(dummyEmployees);
        setAssignState((prev) => {
          const s = createDemoAssignmentState(prev, dummyEmployees, dummyLeads);
          persistAssignmentState(s);
          return s;
        });
      })
    .finally(() => setLoading(false));
}, []);

  const workload = useMemo(
    () => computeWorkload(employees, assignState.assignments, leads),
    [employees, assignState.assignments, leads],
  );

  const enrichedLeads = useMemo(
    () =>
      leads.map((l) => ({
        ...l,
        _assignment: getAssignmentForLead(assignState, l),
        _sourceKey: normalizeSource(l.source || l.form_name),
      })),
    [leads, assignState],
  );

  const metrics = useMemo(() => {
    const total = leads.length;
    const pickup = enrichedLeads.filter((l) => !l._assignment && !isConverted(l)).length;
    const hotLeads = leads.filter((l) =>
      String(l.temperature || "").toLowerCase().includes("hot"),
    ).length;
    const converted = leads.filter(isConverted).length;
    return { total, pickup, hotLeads, converted };
  }, [leads, enrichedLeads]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return enrichedLeads
      .filter((l) => {
        if (sourceFilter !== "All" && l._sourceKey !== sourceFilter) return false;
        if (assignFilter === "Assigned" && !l._assignment) return false;
        if (assignFilter === "Unassigned" && l._assignment) return false;
        if (!q) return true;
        return [l.lead_name, l.company_name, l.email, l.phone, l.phone_number]
          .some((f) => String(f || "").toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const va = a[sortKey] ?? "";
        const vb = b[sortKey] ?? "";
        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
  }, [enrichedLeads, search, sourceFilter, assignFilter, sortKey, sortDir]);

  const handleAssign = useCallback(
    async (lead, employee, method = "manual") => {
      const next = assignLead(assignState, lead, employee, method);
      setAssignState(next);

      try {
        await apiPost("/api/v1/assignment/assign", {
          leadId: getLeadId(lead),
          employeeId: employee.id,
          method: method === "drag-drop" ? "manual" : method,
        }, { headers: getAdminCrmHeaders() });
        invalidateCache("/api/v1");
        setLeads((prev) => prev.map((l) => (
          String(getLeadId(l)) === String(getLeadId(lead))
            ? { ...l, assignedTo: { id: employee.id, name: employee.name } }
            : l
        )));
      } catch {
        // local assignment still applied for offline/demo mode
      }

      showToast(`Assigned to ${employee.name}`);
    },
    [assignState],
  );

  const handleBulkAssign = async (employee) => {
    const toAssign = filtered.filter((l) => selected.has(String(getLeadId(l))));
    if (!toAssign.length) return showToast("Select leads first", "error");
    const leadIds = toAssign.map((l) => getLeadId(l));

    try {
      await apiPost("/api/v1/assignment/bulk-assign", {
        leadIds,
        employeeId: employee.id,
        method: "bulk",
      }, { headers: getAdminCrmHeaders() });
      invalidateCache("/api/v1");
      const next = bulkAssign(assignState, toAssign, employee, "bulk");
      setAssignState(next);
      setLeads((prev) => prev.map((l) => (
        leadIds.includes(String(getLeadId(l)))
          ? { ...l, assignedTo: { id: employee.id, name: employee.name } }
          : l
      )));
      setSelected(new Set());
      setBulkOpen(false);
      showToast(`${toAssign.length} leads assigned to ${employee.name}`);
    } catch (err) {
      showToast(err.message || "Bulk assign failed", "error");
    }
  };

  const handleDropOnEmployee = (cardEmp, dragOverOnly, droppedEmployee) => {
    if (dragOverOnly === true) {
      setDropTarget(cardEmp?.id);
      return;
    }
    setDropTarget(null);
    if (!droppedEmployee || !dragLeadId) return;
    const lead = leads.find((l) => String(getLeadId(l)) === dragLeadId);
    const target = employees.find((e) => e.id === droppedEmployee.id);
    if (lead && target) handleAssign(lead, target, "drag-drop");
    setDragLeadId(null);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => String(getLeadId(l)))));
  };

  const sourcePerformance = useMemo(() => {
    const map = {};
    for (const l of enrichedLeads) {
      const k = l._sourceKey;
      if (!map[k]) map[k] = { source: SOURCE_LABELS[k]?.label || k, leads: 0, converted: 0 };
      map[k].leads += 1;
      if (isConverted(l)) map[k].converted += 1;
    }
    return Object.values(map);
  }, [enrichedLeads]);

  const employeeChartData = useMemo(
    () =>
      employees.map((e) => ({
        name: (e.name || "").split(" ")[0],
        assigned: workload[e.id]?.assigned ?? 0,
        converted: workload[e.id]?.converted ?? 0,
      })),
    [employees, workload],
  );

  const distributionPie = useMemo(() => {
    const assigned = metrics.assigned;
    const unassigned = metrics.unassigned;
    return [
      { name: "Assigned", value: assigned },
      { name: "Unassigned", value: unassigned },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  const unassignedTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = enrichedLeads.filter((l) => {
        if (l._assignment) return false;
        const created = (l.created_at || "").slice(0, 10);
        return created <= key;
      }).length;
      days.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), unassigned: count });
    }
    return days;
  }, [enrichedLeads]);

  const rrOrder = useMemo(() => {
    const order = assignState.distribution.roundRobinOrder?.length
      ? assignState.distribution.roundRobinOrder
      : employees.map((e) => e.id);
    return order
      .map((id, i) => {
        const emp = employees.find((e) => String(e.id) === String(id));
        if (!emp) return null;
        const s = assignState.employeeSettings[String(id)] || {};
        return {
          order: i + 1,
          name: emp.name,
          paused: s.receivingPaused,
          today: assignState.todayStats?.byEmployee?.[String(id)] || 0,
        };
      })
      .filter(Boolean);
  }, [assignState, employees]);

  const leadAudit = (lead) => {
    if (!lead) return [];
    const lid = String(getLeadId(lead));
    return assignState.auditLog.filter((e) => e.leadId === lid);
  };

  const handleAddClose = (newLead) => {
    if (newLead && typeof newLead === "object") {
      const withSource = { ...newLead, source: newLead.source || "Manual" };
      setLeads((prev) => [withSource, ...prev]);
    }
    setAddOpen(false);
  };

  const modeLabels = {
    "round-robin": "Round Robin",
    workload: "Workload-based",
    skill: "Skill-based",
  };

  return (
    <div className="space-y-4 pb-6 page-shell min-w-0">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Total Leads" value={metrics.total} icon={Users} tone="primary" change={`${metrics.total} in pipeline`} sub="" />
        <StatCard label="Pickup" value={metrics.pickup} icon={PhoneCall} tone="info" change={metrics.pickup ? "Awaiting assignment" : "Queue clear"} sub="" />
        <StatCard label="Hot Leads" value={metrics.hotLeads} icon={Flame} tone="warning" change={metrics.hotLeads ? "High intent" : "None hot right now"} sub="" />
        <StatCard label="Converted" value={metrics.converted} icon={Target} tone="success" change="Closed won" sub="" />
            </div>

      {/* Round Robin center */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-rose-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <Shuffle className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">Round Robin Distribution</p>
              <p className="text-[10px] text-slate-500 truncate">
                {modeLabels[assignState.distribution.mode]} · {assignState.distribution.autoAssign ? "Auto ON" : "Auto OFF"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 w-full md:w-auto md:justify-end">
            <div className={`${SEGMENT_WRAP} w-full md:w-auto`}>
            {(["round-robin", "workload", "skill"]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAssignState(setDistributionMode(assignState, m))}
                className={`${SEGMENT_BTN} ${assignState.distribution.mode === m ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE}`}
              >
                {modeLabels[m]}
              </button>
            ))}
            </div>
            <button
              type="button"
              onClick={() => setAssignState(setAutoAssign(assignState, !assignState.distribution.autoAssign))}
              className={`${PERIOD_PILL_BTN} ${PERIOD_PILL_INACTIVE}`}
            >
              {assignState.distribution.autoAssign ? "Disable Auto" : "Enable Auto"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (selected.size === 0) {
                  showToast("Select leads in the queue, choose a mode, then Run Now", "error");
                  return;
                }
                const selectedLeads = leads.filter((l) =>
                  selected.has(String(getLeadId(l))),
                );

                setAssignState((prev) => {
                  const { state: next, assignedCount } = runDistributionNow(
                    prev,
                    employees,
                    leads,
                    selectedLeads,
                  );
                  if (assignedCount === 0) {
                    showToast(
                      "Could not assign — reps may be paused, on leave, or at capacity",
                      "error",
                    );
                  } else {
                    showToast(
                      `${assignedCount} selected lead${assignedCount === 1 ? "" : "s"} assigned via ${modeLabels[prev.distribution.mode]}`,
                    );
                    setSelected(new Set());
                  }
                  return next;
                });
              }}
              className={`${PERIOD_PILL_BTN} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1`}
            >
              <Zap size={11} /> Run Now
              {selected.size > 0 && (
                <span className="ml-0.5 px-1 py-0 rounded bg-emerald-600 text-white text-[9px]">
                  {selected.size}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Mobile: stacked list + stat cards */}
        <div className="p-3 sm:p-4 md:hidden">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Allocation Order</p>
          <div className="space-y-1">
            {rrOrder.map((r) => (
              <div
                key={r.order}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
                  r.paused ? "bg-amber-50/80 border-amber-200" : "bg-white border-rose-100"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 grid place-items-center text-[9px] font-black shrink-0">
                    {r.order}
                  </span>
                  <span className={`text-[11px] font-semibold truncate ${r.paused ? "text-amber-800" : "text-slate-700"}`}>
                    {r.name}
                  </span>
                </div>
                {r.today > 0 && (
                  <Badge tone="success">
                    <span className="text-[9px]">{r.today} today</span>
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-lg bg-rose-50/80 px-2 py-2 text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Assigned Today</p>
              <p className="text-lg font-black text-rose-700 leading-tight">{assignState.todayStats?.total || 0}</p>
            </div>
            <div className="rounded-lg bg-emerald-50/80 px-2 py-2 text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Active Reps</p>
              <p className="text-lg font-black text-emerald-700 leading-tight">
                {employees.filter((e) => {
                  const s = assignState.employeeSettings[String(e.id)] || {};
                  return !s.receivingPaused && e.status !== "inactive";
                }).length}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop: allocation pills + stats in one row (wraps to 2nd row if needed) */}
        <div className="hidden md:block p-3 sm:p-4">
          <div className="flex items-end gap-3 flex-wrap xl:flex-nowrap">
            <div className="flex-1 min-w-[280px]">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Allocation Order</p>
              <div className="flex flex-wrap gap-1.5">
                {rrOrder.map((r) => (
                  <span
                    key={r.order}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${
                      r.paused ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-white border-rose-100 text-slate-700"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 grid place-items-center text-[9px] shrink-0">
                      {r.order}
                    </span>
                    {r.name}
                    {r.today > 0 && (
                      <Badge tone="success">
                        <span className="text-[9px]">{r.today} today</span>
                      </Badge>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 ml-auto">
              <div className="rounded-lg bg-rose-50/80 px-3 py-2 text-center min-w-[96px]">
                <p className="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">Assigned Today</p>
                <p className="text-xl font-black text-rose-700 leading-tight">{assignState.todayStats?.total || 0}</p>
              </div>
              <div className="rounded-lg bg-emerald-50/80 px-3 py-2 text-center min-w-[96px]">
                <p className="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">Active Reps</p>
                <p className="text-xl font-black text-emerald-700 leading-tight">
                  {employees.filter((e) => {
                    const s = assignState.employeeSettings[String(e.id)] || {};
                    return !s.receivingPaused && e.status !== "inactive";
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Main two-column — right column stretches to match left card height */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 items-stretch min-w-0">
        {/* Lead queue */}
        <div className="xl:col-span-2 flex flex-col min-h-0 min-w-0">
          <div style={cardBase} className="overflow-hidden flex flex-col flex-1 min-w-0">
            <div className="px-3 sm:px-4 py-2.5 border-b border-rose-50">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                {/* Search + filters */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-[240px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-300 pointer-events-none" />
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search leads…"
                      className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-rose-100 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-400 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:contents">
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="w-full sm:w-auto sm:min-w-[112px] h-8 px-2 rounded-lg border border-rose-100 text-[10px] sm:text-[11px] font-bold text-rose-800 bg-white outline-none focus:border-rose-400"
                    >
                      <option value="All">All Sources</option>
                      {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <select
                      value={assignFilter}
                      onChange={(e) => setAssignFilter(e.target.value)}
                      className="w-full sm:w-auto sm:min-w-[104px] h-8 px-2 rounded-lg border border-rose-100 text-[10px] sm:text-[11px] font-bold text-rose-800 bg-white outline-none focus:border-rose-400"
                    >
                      <option value="All">All Status</option>
                      <option value="Unassigned">Unassigned</option>
                      <option value="Assigned">Assigned</option>
                    </select>
                  </div>
          </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg border border-rose-200 text-rose-700 text-[10px] sm:text-[11px] font-bold hover:bg-rose-50 transition whitespace-nowrap"
                  >
                    <History size={12} /> Audit Log
                  </button>
                  {selected.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setBulkOpen(true)}
                      className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg border border-rose-200 text-rose-700 text-[10px] sm:text-[11px] font-bold hover:bg-rose-50 transition whitespace-nowrap"
                    >
                      <Layers size={12} /> Bulk ({selected.size})
            </button>
          )}
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg gradient-primary text-white text-[10px] sm:text-[11px] font-bold shadow-glow hover:opacity-95 transition whitespace-nowrap"
                  >
                    <Plus size={12} /> New Lead
                  </button>
                </div>
              </div>
        </div>

            <div className="max-h-[480px] overflow-y-auto">
              {loading ? (
                <p className="p-6 text-center text-rose-300 font-semibold text-xs">Loading queue…</p>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-slate-400 text-xs">No leads match filters</p>
              ) : isMobile ? (
                <div className="p-2 sm:p-3 flex flex-col gap-2">
                  {filtered.map((lead) => {
                    const lid = String(getLeadId(lead));
                    return (
                      <div
                        key={lid}
                        draggable
                        onDragStart={() => setDragLeadId(lid)}
                        onDragEnd={() => setDragLeadId(null)}
                        className="rounded-xl border border-rose-100 bg-white p-2.5 active:bg-rose-50/30"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="shrink-0 w-3.5 h-3.5"
                            checked={selected.has(lid)}
                            onChange={() => toggleSelect(lid)}
                          />
                          <button type="button" onClick={() => setDetailLead(lead)} className="text-left flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">{lead.lead_name || "—"}</p>
                            <p className="text-[10px] text-slate-400 truncate">{lead.company_name || lead.email}</p>
                          </button>
                          <GripVertical size={14} className="text-rose-300 shrink-0" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-5">
                          <SourceBadge lead={lead} compact />
                          {lead._assignment ? (
                            <span className="text-[10px] font-bold text-emerald-700 truncate max-w-[40%]">{lead._assignment.employeeName}</span>
                          ) : (
                            <Badge tone="warning"><span className="text-[9px]">Unassigned</span></Badge>
                          )}
                          <span className="text-[10px] font-semibold text-slate-500">{lead.pipeline_stage || lead.status || "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="p-2 w-8">
                      <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                    </th>
                    <th className="p-2 text-left text-[9px] font-bold text-rose-700 uppercase tracking-wider">Lead</th>
                    <th className="p-2 text-left text-[9px] font-bold text-rose-700 uppercase tracking-wider">Source</th>
                    <th className="p-2 text-left text-[9px] font-bold text-rose-700 uppercase tracking-wider">Assignment</th>
                    <th className="p-2 text-left text-[9px] font-bold text-rose-700 uppercase tracking-wider">Stage</th>
                    <th className="p-2 w-8" />
                </tr>
              </thead>
              <tbody>
                  {filtered.map((lead) => {
                    const lid = String(getLeadId(lead));
                    return (
                      <tr
                        key={lid}
                        draggable
                        onDragStart={() => setDragLeadId(lid)}
                        onDragEnd={() => setDragLeadId(null)}
                        className="border-t border-rose-50/80 hover:bg-rose-50/40 cursor-grab active:cursor-grabbing"
                      >
                        <td className="p-2">
                          <input type="checkbox" checked={selected.has(lid)} onChange={() => toggleSelect(lid)} />
                        </td>
                        <td className="p-2">
                          <button type="button" onClick={() => setDetailLead(lead)} className="text-left">
                            <p className="text-xs font-bold text-slate-900">{lead.lead_name || "—"}</p>
                            <p className="text-[10px] text-slate-400">{lead.company_name || lead.email}</p>
                          </button>
                        </td>
                        <td className="p-2"><SourceBadge lead={lead} compact /></td>
                        <td className="p-2">
                          {lead._assignment ? (
                            <span className="text-[10px] font-bold text-emerald-700">{lead._assignment.employeeName}</span>
                          ) : (
                            <Badge tone="warning"><span className="text-[9px]">Unassigned</span></Badge>
                          )}
                        </td>
                        <td className="p-2">
                          <span className="text-[10px] font-semibold text-slate-600">{lead.pipeline_stage || lead.status || "—"}</span>
                        </td>
                        <td className="p-2 text-rose-300">
                          <GripVertical size={14} />
                          </td>
                      </tr>
                        );
                      })}
              </tbody>
            </table>
              </div>
              )}
            </div>
            <div className="px-3 sm:px-4 py-2 border-t border-rose-50 text-[9px] sm:text-[10px] text-slate-400">
              Select leads → pick mode → Run Now · drag onto employee cards · {filtered.length} in queue
            </div>
          </div>
          </div>

        {/* Employee workload panel */}
        <div className="flex flex-col min-h-0 min-w-0">
          <div style={cardBase} className="flex flex-col flex-1 overflow-hidden h-full min-w-0">
            <div className="px-3 sm:px-4 py-2.5 border-b border-rose-50 shrink-0">
              <p className="text-xs font-bold text-slate-900">Employee Workload</p>
              <p className="text-[10px] text-slate-500">Drop leads here to assign</p>
            </div>
            <div className="flex flex-col flex-1 min-h-0">
              <div
                className="overflow-y-auto overflow-x-hidden px-3 pt-3 pb-2 space-y-2 shrink-0 scrollbar-thin"
                style={{ height: EMPLOYEE_LIST_VIEWPORT_PX, maxHeight: EMPLOYEE_LIST_VIEWPORT_PX }}
              >
            {employees.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No team members loaded</p>
            ) : (
              employees.map((emp) => {
                const stats = workload[emp.id] || { assigned: 0, active: 0, converted: 0, followUps: 0 };
                const settings = assignState.employeeSettings[String(emp.id)] || {};
                const cap = settings.maxCapacity ?? 15;
                const utilPct = cap > 0 ? Math.round((stats.active / cap) * 100) : 0;
                const status = workloadStatus(utilPct);
                return (
                  <EmployeeCard
                    key={emp.id}
                    emp={emp}
                    stats={stats}
                    utilPct={utilPct}
                    status={status}
                    paused={settings.receivingPaused}
                    onTogglePause={(id) => setAssignState(toggleEmployeeReceiving(assignState, id))}
                    onDrop={(a, b) => handleDropOnEmployee(emp, a, b)}
                    dragOver={dropTarget === emp.id}
                  />
                );
              })
            )}
              </div>
              {employees.length > VISIBLE_EMPLOYEE_COUNT && (
                <p className="px-4 pb-3 pt-1 text-[10px] font-semibold text-slate-400 text-center shrink-0">
                  Scroll for {employees.length - VISIBLE_EMPLOYEE_COUNT} more team member{employees.length - VISIBLE_EMPLOYEE_COUNT === 1 ? "" : "s"}
                </p>
              )}
              <div className="flex-1 min-h-0" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div>
        <button
          type="button"
          onClick={() => setShowAnalytics((v) => !v)}
          className="flex items-center gap-2 text-sm font-bold text-rose-700 mb-4"
        >
          {showAnalytics ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          Analytics & Performance
        </button>
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
            >
              <GlassCard className="p-5">
                <SectionHeader title="Lead Source Performance" subtitle="Volume & conversions by channel" />
                <ResponsiveContainer width="100%" height={220} className="chart-wrap">
                  <BarChart data={sourcePerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" />
                    <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="leads" fill="#fda4af" name="Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="converted" fill="#be123c" name="Converted" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader title="Lead Distribution" subtitle="Assigned vs unassigned" />
                <ResponsiveContainer width="100%" height={220} className="chart-wrap">
                  <PieChart>
                    <Pie data={distributionPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {distributionPie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader title="Employee Workload" subtitle="Assigned & converted per rep" />
                <ResponsiveContainer width="100%" height={220} className="chart-wrap">
                  <BarChart data={employeeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="assigned" fill="#fb7185" name="Assigned" />
                    <Bar dataKey="converted" fill="#16a34a" name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader title="Unassigned Lead Trend" subtitle="Last 7 days" />
                <ResponsiveContainer width="100%" height={220} className="chart-wrap">
                  <AreaChart data={unassignedTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="unassigned" stroke="#be123c" fill="#fecdd3" name="Unassigned" />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddLeadDrawer open={addOpen} onClose={handleAddClose} showToast={showToast} />

      <LeadDetailDrawer
        open={!!detailLead}
        onClose={() => setDetailLead(null)}
        lead={detailLead}
        assignment={detailLead ? getAssignmentForLead(assignState, detailLead) : null}
        employees={employees}
        onAssign={(lead, emp) => {
          handleAssign(lead, emp, detailLead?._assignment ? "reassign" : "manual");
          setDetailLead(null);
        }}
        auditEntries={detailLead ? leadAudit(detailLead) : []}
      />

      <Drawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="Assignment Audit Log">
        <ul className="space-y-3 max-h-[70vh] overflow-y-auto">
          {assignState.auditLog.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No assignment events yet</p>
          ) : (
            assignState.auditLog.map((e) => (
              <li key={e.id} className="rounded-xl border border-rose-100 p-3 text-sm">
                <span className="font-bold capitalize text-slate-800">{e.action}</span>
                {" — "}
                <span className="text-slate-600">{e.leadName}</span>
                {" → "}
                <span className="text-rose-700 font-semibold">{e.employeeName || "—"}</span>
                <p className="text-[11px] text-slate-400 mt-1">
                  {new Date(e.at).toLocaleString()} · {e.method}
                </p>
              </li>
            ))
          )}
        </ul>
      </Drawer>

      <Drawer open={bulkOpen} onClose={() => setBulkOpen(false)} title={`Bulk Assign (${selected.size} leads)`}>
        <p className="text-sm text-slate-500 mb-4">Choose an employee to receive selected leads.</p>
        <div className="grid gap-2">
          {employees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => handleBulkAssign(emp)}
              className="w-full text-left px-4 py-3 rounded-xl border border-rose-100 hover:border-rose-400 hover:bg-rose-50 font-semibold text-slate-800 transition"
            >
              {emp.name}
              <span className="text-xs text-slate-400 block">{emp.department || emp.role}</span>
            </button>
          ))}
        </div>
      </Drawer>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
          style={{
            background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecdd3"}`,
            color: toast.type === "success" ? "#15803d" : "#be123c",
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <X size={16} />}
          {toast.message}
        </motion.div>
      )}
    </div>
  );
}
