import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Kanban, Flame, TrendingUp, ThumbsDown, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard, Badge, StatCard } from "../../components/Primitives.jsx";
import AddLeadDrawer from "../../components/AddLeadDrawer.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import {
  EMP_KANBAN_STAGES,
  LEAD_STATUS_LABELS,
  formatEmpPipelineValue,
  getEmpPipelineSummary,
  getEmpStageMeta,
  groupEmpLeadsKanban,
  isEmployeeNewAssignedLead,
  mapEmpLeadKanbanStage,
} from "../../data/employeeMock.js";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../../lib/segmentPills.js";
import useIsMobile from "../../lib/useIsMobile.js";
import EmployeeLeadDrawer from "../components/EmployeeLeadDrawer.jsx";
import { LeadStatusBadge } from "../components/EmpUI.jsx";


function LeadCard({ lead, onOpen, isDragging, onDragStart, onDragEnd, isNewAssigned }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/lead-id", String(lead.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      className={`rounded-xl border bg-white transition group shrink-0 w-[min(72vw,200px)] sm:w-full sm:shrink snap-start ${
        isNewAssigned ? "border-rose-300 ring-1 ring-rose-100" : "border-rose-100"
      } ${isDragging ? "opacity-40 scale-[0.98]" : "hover:border-rose-300 hover:shadow-md"}`}
    >
      <button type="button" onClick={onOpen} className="w-full text-left p-3">
        {isNewAssigned && (
          <span className="inline-block mb-1.5 text-[8px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
            Admin assigned
          </span>
        )}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-900 truncate group-hover:text-rose-800 transition">{lead.name}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{lead.company}</p>
          </div>
          <LeadStatusBadge status={lead.status} label={LEAD_STATUS_LABELS[lead.status]} />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-rose-50">
          <span className="text-xs font-black text-rose-700 tabular-nums">{lead.budget}</span>
          <span className="text-[9px] font-medium text-slate-400">{lead.last}</span>
        </div>
      </button>
    </div>
  );
}

function isLeadInPeriod(lead, period, now = new Date()) {
  const dateStr = lead.createdAt || lead.created_at;
  if (!dateStr) return true;
  const leadDate = new Date(dateStr);
  if (Number.isNaN(leadDate.getTime())) return true;

  const nowClone = new Date(now);
  const startOfToday = new Date(nowClone.getFullYear(), nowClone.getMonth(), nowClone.getDate());

  if (period === "today") {
    return leadDate >= startOfToday;
  }
  if (period === "week") {
    const day = nowClone.getDay();
    const diff = nowClone.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(nowClone.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return leadDate >= startOfWeek;
  }
  if (period === "month") {
    const startOfMonth = new Date(nowClone.getFullYear(), nowClone.getMonth(), 1);
    return leadDate >= startOfMonth;
  }
  return true;
}

export default function EmployeeLeads() {
  const { leads, addLead, updateLeadStage, employee } = useEmployee();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("filter");
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(searchParams.get("action") === "add");
  const [dragLeadId, setDragLeadId] = useState(null);
  const [dropStageId, setDropStageId] = useState(null);
  const [cashCollections, setCashCollections] = useState([]);
  const columnRefs = useRef({});
  const period = searchParams.get("period") || "month";

  useEffect(() => {
    if (searchParams.get("action") === "add") setModalOpen(true);
  }, [searchParams]);

  // Fetch cash collections list for this employee
  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    import("../../lib/api.js").then(({ apiGet }) => {
      apiGet(`/api/v1/employees/${employee.id}/cash-collections`, { skipCache: true, cacheTtl: 0 })
        .then((res) => {
          if (!cancelled && res?.success) {
            setCashCollections(Array.isArray(res.data) ? res.data : []);
          }
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [employee?.id]);

  const totalCash = useMemo(() => {
    const list = Array.isArray(cashCollections) ? cashCollections : [];
    const filteredList = list.filter((cc) => {
      const dateStr = cc.paymentAt || cc.createdAt;
      if (!dateStr) return false;
      const payDate = new Date(dateStr);
      if (Number.isNaN(payDate.getTime())) return false;

      const now = new Date();
      const nowClone = new Date(now);
      const startOfToday = new Date(nowClone.getFullYear(), nowClone.getMonth(), nowClone.getDate());

      if (period === "today") {
        return payDate >= startOfToday;
      }
      if (period === "week") {
        const day = nowClone.getDay();
        const diff = nowClone.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(nowClone.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        return payDate >= startOfWeek;
      }
      if (period === "month") {
        const startOfMonth = new Date(nowClone.getFullYear(), nowClone.getMonth(), 1);
        return payDate >= startOfMonth;
      }
      return true;
    });

    return filteredList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [cashCollections, period]);

  function formatCashCard(val) {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString("en-IN")}`;
  }

  const baseLeads = useMemo(() => {
    const periodFilteredLeads = leads.filter((l) => isLeadInPeriod(l, period));
    if (!statusFilter || statusFilter === "all") return periodFilteredLeads;
    const sf = statusFilter.toLowerCase();
    return periodFilteredLeads.filter((l) => {
      const status = String(l.status || "").toLowerCase();
      const temp = String(l.temperature || "").toLowerCase();
      return status === sf || temp.includes(sf);
    });
  }, [leads, statusFilter, period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseLeads;
    return baseLeads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q),
    );
  }, [baseLeads, search]);

  const grouped = useMemo(() => groupEmpLeadsKanban(filtered), [filtered]);
  const summary = useMemo(() => getEmpPipelineSummary(filtered), [filtered]);

  const scrollToStage = (stageId) => {
    setActiveStage(stageId);
    columnRefs.current[stageId]?.scrollIntoView({
      behavior: "smooth",
      inline: isMobile ? "nearest" : "start",
      block: isMobile ? "start" : "nearest",
    });
  };

  const moveLeadToStage = (leadId, stageId, { scroll = true } = {}) => {
    const lead = leads.find((l) => l.id === Number(leadId) || l.id === leadId);
    if (!lead) return;
    const target = getEmpStageMeta(stageId);
    const currentStageId = mapEmpLeadKanbanStage(lead.stage, lead.status);
    if (currentStageId === stageId) {
      if (scroll) scrollToStage(stageId);
      return;
    }
    updateLeadStage(lead.id, target.label, { fromNewAssigned: isEmployeeNewAssignedLead(lead) });
    if (scroll) scrollToStage(stageId);
    toast.success(
      isEmployeeNewAssignedLead(lead)
        ? `Accepted · moved to ${target.label}`
        : `Moved to ${target.label}`,
      { id: `lead-move-${lead.id}-${stageId}` },
    );
  };

  const closeModal = () => {
    setModalOpen(false);
    if (searchParams.get("action") === "add") {
      setSearchParams({}, { replace: true });
    }
  };

  const handleAddClose = (newLead) => {
    if (newLead && typeof newLead === "object") {
      const lead = addLead(newLead);
      toast.success(`${lead.name} added to pipeline`);
      scrollToStage(mapEmpLeadKanbanStage(lead.stage, lead.status));
    }
    closeModal();
  };

  const showToast = (message, type = "success") => {
    if (type === "error") toast.error(message);
    else toast.success(message);
  };

  return (
    <div className="space-y-3 sm:space-y-4 page-shell min-w-0 animate-fade-in">
      <GlassCard className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <StatCard
            label="Pipeline Value"
            value={formatEmpPipelineValue(summary.value)}
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            change="+14%"
            sub="vs last month"
          />
          <StatCard
            label="Total Leads"
            value={String(summary.total)}
            icon={Kanban}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            change="+8%"
            sub="this month"
          />
          <StatCard
            label="Hot Leads"
            value={String(summary.hot)}
            icon={Flame}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            change="High intent"
            sub=""
          />
          <StatCard
            label="Not Interested"
            value={String(summary.notInterested)}
            icon={ThumbsDown}
            iconBg="bg-slate-50"
            iconColor="text-slate-500"
            change="Closed lost"
            sub=""
          />
          <StatCard
            label="Total Cash Collected"
            value={formatCashCard(totalCash)}
            icon={Wallet}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            change="This month"
            sub=""
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1 border-t border-rose-50">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, company, or source..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-rose-100 bg-white text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 shadow-sm shrink-0 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
        </div>

        <div className={`${SEGMENT_WRAP} w-full -mx-0.5`}>
          {EMP_KANBAN_STAGES.map((stage) => {
            const count = grouped[stage.id]?.length ?? 0;
            const active = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => scrollToStage(stage.id)}
                className={`flex items-center gap-1 ${SEGMENT_BTN} ${
                  active ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                }`}
              >
                <span className="sm:hidden">{stage.label.split(" ")[0]}</span>
                <span className="hidden sm:inline">{stage.label}</span>
                <span className={`tabular-nums ${active ? "text-rose-600" : "text-slate-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-3 sm:p-4 overflow-hidden">
        <p className="text-[10px] text-slate-400 mb-2.5 px-0.5">
          <span className="sm:hidden">Each stage is a row · swipe cards horizontally · tap for details</span>
          <span className="hidden sm:inline">Drag cards between columns · tap card for details</span>
        </p>

        {/* Mobile — one row per stage, horizontal card scroll within each row */}
        <div className="sm:hidden space-y-4">
          {EMP_KANBAN_STAGES.map((stage) => {
            const columnLeads = grouped[stage.id] || [];
            const isDropTarget = dropStageId === stage.id;
            return (
              <section
                key={stage.id}
                ref={(el) => { columnRefs.current[stage.id] = el; }}
                className="min-w-0"
              >
                <button
                  type="button"
                  onClick={() => scrollToStage(stage.id)}
                  className="flex items-center justify-between gap-2 mb-2 px-0.5 text-left w-full hover:opacity-80 transition"
                >
                  <Badge tone={stage.badgeTone}>{stage.label}</Badge>
                  <span className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-700 grid place-items-center tabular-nums">
                    {columnLeads.length}
                  </span>
                </button>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropStageId(stage.id);
                  }}
                  onDragLeave={() => setDropStageId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropStageId(null);
                    setDragLeadId(null);
                    const id = e.dataTransfer.getData("text/lead-id");
                    if (id) moveLeadToStage(id, stage.id);
                  }}
                  className={`rounded-xl border p-2 transition ${
                    isDropTarget
                      ? "border-rose-400 bg-rose-50/80 ring-2 ring-rose-200"
                      : "border-rose-100 bg-[#fffbfb]/80"
                  } flex flex-row gap-2 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-thin min-h-[108px] -mx-0.5 px-0.5`}
                >
                  {columnLeads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-rose-200 bg-white/60 p-4 text-center shrink-0 w-[min(72vw,200px)] min-h-[88px] flex items-center justify-center">
                      <p className="text-[11px] text-slate-400">
                        {stage.id === "conversation" ? "New & active leads start here" : "No leads here"}
                      </p>
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        isNewAssigned={isEmployeeNewAssignedLead(lead)}
                        isDragging={dragLeadId === lead.id}
                        onOpen={() => setSelected(lead)}
                        onDragStart={() => setDragLeadId(lead.id)}
                        onDragEnd={() => setDragLeadId(null)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Desktop — horizontal kanban columns, vertical card stack */}
        <div className="hidden sm:block overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1 snap-x snap-mandatory">
          <div className="flex gap-3 min-w-max">
            {EMP_KANBAN_STAGES.map((stage) => {
              const columnLeads = grouped[stage.id] || [];
              const isDropTarget = dropStageId === stage.id;
              return (
                <div
                  key={stage.id}
                  ref={(el) => { columnRefs.current[stage.id] = el; }}
                  className="w-[252px] shrink-0 snap-start flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => scrollToStage(stage.id)}
                    className="flex items-center justify-between gap-2 mb-2.5 px-0.5 text-left hover:opacity-80 transition"
                  >
                    <Badge tone={stage.badgeTone}>{stage.label}</Badge>
                    <span className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-700 grid place-items-center tabular-nums">
                      {columnLeads.length}
                    </span>
                  </button>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropStageId(stage.id);
                    }}
                    onDragLeave={() => setDropStageId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropStageId(null);
                      setDragLeadId(null);
                      const id = e.dataTransfer.getData("text/lead-id");
                      if (id) moveLeadToStage(id, stage.id);
                    }}
                    className={`rounded-xl border p-2 space-y-2 max-h-[calc(100dvh-400px)] min-h-[320px] overflow-y-auto overscroll-contain scrollbar-thin transition ${
                      isDropTarget
                        ? "border-rose-400 bg-rose-50/80 ring-2 ring-rose-200"
                        : "border-rose-100 bg-[#fffbfb]/80"
                    }`}
                  >
                    {columnLeads.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-rose-200 bg-white/60 p-4 text-center">
                        <p className="text-[11px] text-slate-400">
                          {stage.id === "conversation" ? "Drop leads here to start conversation" : "Drop leads here"}
                        </p>
                      </div>
                    ) : (
                      columnLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          isNewAssigned={isEmployeeNewAssignedLead(lead)}
                          isDragging={dragLeadId === lead.id}
                          onOpen={() => setSelected(lead)}
                          onDragStart={() => setDragLeadId(lead.id)}
                          onDragEnd={() => setDragLeadId(null)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <AddLeadDrawer
        open={modalOpen}
        onClose={handleAddClose}
        showToast={showToast}
        title="New Lead"
        subtitle="Add a lead directly to your pipeline board."
        pipelineStages={EMP_KANBAN_STAGES.map((s) => s.label)}
        defaultStage="Conversation"
      />

      <EmployeeLeadDrawer lead={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
