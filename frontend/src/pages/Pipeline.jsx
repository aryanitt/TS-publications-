import { useEffect, useMemo, useRef, useState, useDeferredValue, memo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, Kanban, Flame, TrendingUp, Thermometer, Snowflake, ThumbsDown } from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard, Badge, StatCard } from "../components/Primitives.jsx";
import AddLeadDrawer from "../components/AddLeadDrawer.jsx";
import PipelineLeadDrawer from "../components/pipeline/PipelineLeadDrawer.jsx";
import {
  PIPELINE_STAGES,
  PRIORITY_BADGE,
  formatPipelineValue,
  getPipelineSummary,
  getStageMeta,
  leadFromForm,
  patchLead,
} from "../data/pipelineMock.js";
import { apiPatch, invalidateCache } from "../lib/api.js";
import { getAdminCrmHeaders } from "../lib/crmContext.js";
import { useAdmin } from "../context/AdminContext.jsx";
import { adminPipelineIdToDbStage } from "../lib/leadSync.js";
import useIsMobile from "../lib/useIsMobile.js";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../lib/segmentPills.js";
import { CALL_CONVERSATION_LABEL } from "../lib/callMetrics.js";
import { usePipelineBoard, visibleKanbanColumnLeads, hiddenKanbanColumnCount } from "../lib/usePipelineBoard.js";
import { usePipelineSync, invalidatePipelineBoardCache } from "../lib/usePipelineSync.js";
import { resolveLeadKanbanColumn, getPipelineStagePillCount } from "../lib/leadKanban.js";
import { buildLeadActivityLabelMap } from "../lib/callDisplay.js";

function startLeadCardDrag(e, leadId, onDragStart) {
  e.dataTransfer.setData("text/plain", String(leadId));
  e.dataTransfer.setData("text/lead-id", String(leadId));
  e.dataTransfer.effectAllowed = "move";
  onDragStart?.();
}

function isDraggablePipelineLead(lead) {
  if (!lead || lead._fromCall || lead._fromMeeting) return false;
  const dbId = lead._dbId ?? lead.id;
  return /^\d+$/.test(String(dbId));
}

const LeadCard = memo(function LeadCard({ lead, lastLabel, onOpen, isDragging, onDragStart, onDragEnd }) {
  const priorityTone = PRIORITY_BADGE[lead.priority] || "muted";
  const canDrag = isDraggablePipelineLead(lead);

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) {
          e.preventDefault();
          return;
        }
        startLeadCardDrag(e, lead._dbId ?? lead.id, onDragStart);
      }}
      onDragEnd={onDragEnd}
      className={`rounded-xl border border-rose-100 bg-white transition group shrink-0 w-[min(72vw,200px)] sm:w-full sm:shrink snap-start ${
        canDrag ? "cursor-grab active:cursor-grabbing select-none" : ""
      } ${isDragging ? "opacity-40 scale-[0.98]" : "hover:border-rose-300 hover:shadow-md"}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="w-full text-left p-3"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-900 truncate group-hover:text-rose-800 transition">{lead.name}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{lead.company}</p>
          </div>
          <Badge tone={priorityTone}>{lead.priority}</Badge>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-rose-50">
          <span className="text-xs font-black text-rose-700 tabular-nums">{formatPipelineValue(lead.value)}</span>
          <span className="text-[9px] font-medium text-slate-400">{lastLabel}</span>
        </div>
      </div>
    </div>
  );
});

export default function Pipeline() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dragLeadId, setDragLeadId] = useState(null);
  const [dropStageId, setDropStageId] = useState(null);
  const columnRefs = useRef({});
  const dropDepthRef = useRef(0);
  const period = String(searchParams.get("period") || "month").toLowerCase();
  const deferredPeriod = useDeferredValue(period);
  const isBoardStale = deferredPeriod !== period;
  const periodLabel = period === "today" ? "Today" : period === "week" ? "This Week" : "This Month";
  const [groupRev, setGroupRev] = useState(0);
  const [expandedColumns, setExpandedColumns] = useState({});

  const {
    leads: syncedLeads,
    calls: syncedBoardCalls,
    meetings: boardMeetings,
    loading: boardLoading,
    syncing: boardSyncing,
  } = usePipelineSync({
    scope: "admin",
    period: deferredPeriod,
    enabled: true,
    mapLeads: true,
  });

  useEffect(() => {
    if (!Array.isArray(syncedLeads)) return;
    setLeads(syncedLeads);
  }, [syncedLeads]);

  const periodCalls = syncedBoardCalls || [];

  useEffect(() => {
    setExpandedColumns({});
  }, [period]);

  const meetings = boardMeetings || [];
  const leadsLoading = boardLoading;
  const callsSyncing = boardSyncing;

  const handleDragEnter = (stageId) => {
    dropDepthRef.current += 1;
    setDropStageId(stageId);
  };

  const handleDragLeave = () => {
    dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
    if (dropDepthRef.current === 0) setDropStageId(null);
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    dropDepthRef.current = 0;
    setDropStageId(null);
    setDragLeadId(null);
    const id = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/lead-id");
    if (id) moveLeadToStage(id, stageId);
  };

  const openLeadDetail = (lead) => setSelectedLead(lead);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("action") === "addLead") {
      setAddOpen(true);
    }
  }, [location.search]);

  const showToast = (message, type = "success") => {
    if (type === "error") toast.error(message);
    else toast.success(message);
  };

  const handleAddClose = (newLead) => {
    if (newLead && typeof newLead === "object") {
      const pipelineLead = leadFromForm(newLead);
      setLeads((prev) => [pipelineLead, ...prev]);
      scrollToStage(pipelineLead.stage);
    }
    setAddOpen(false);
    if (new URLSearchParams(location.search).get("action") === "addLead") {
      navigate("/pipeline", { replace: true });
    }
  };

  const { selectedService } = useAdmin();

  const filtered = useMemo(() => {
    let list = leads || [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          (l?.name || "").toLowerCase().includes(q) ||
          (l?.company || "").toLowerCase().includes(q),
      );
    }
    if (selectedService && selectedService !== "All Services") {
      list = list.filter((l) => l.service === selectedService || l.requirements === selectedService);
    }
    return list;
  }, [leads, search, selectedService]);

  const deferredFiltered = useDeferredValue(filtered);

  const {
    callScopedOnly,
    grouped,
    stageDisplayCounts,
    syncedConversationCalls,
    syncedNotPickupCalls,
    periodMeetings,
  } = usePipelineBoard({
    leads,
    period: deferredPeriod,
    periodCalls,
    callsLoading: boardLoading,
    callyzerStats: null,
    meetings,
    adminScope: false,
    includeUncontactedAssignments: true,
    scopeCallsByAssignee: true,
    visibleLeads: deferredFiltered,
    groupRev,
  });

  const activityLabelMap = useMemo(
    () => buildLeadActivityLabelMap(grouped, periodCalls),
    [grouped, periodCalls],
  );

  const kanbanLeads = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const stage of PIPELINE_STAGES) {
      for (const lead of grouped[stage.id] || []) {
        const id = String(lead.id);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(lead);
      }
    }
    return out;
  }, [grouped]);

  const summary = useMemo(
    () => getPipelineSummary(period === "month" ? filtered : kanbanLeads),
    [period, filtered, kanbanLeads],
  );

  const getColumnCount = (stageId, columnLeads) => columnLeads.length;

  const getStagePillCount = (stageId, columnLeads) => getPipelineStagePillCount(stageId, { grouped }) || columnLeads.length;

  const scrollToStage = (stageId) => {
    setActiveStage(stageId);
    columnRefs.current[stageId]?.scrollIntoView({
      behavior: "smooth",
      inline: isMobile ? "nearest" : "start",
      block: isMobile ? "start" : "nearest",
    });
  };

  const applyLeadUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead((current) => (current?.id === updated.id ? updated : current));
  };

  const handleUpdateLead = (updated) => {
    applyLeadUpdate(updated);
  };

  const moveLeadToStage = (leadId, stageId, { scroll = true } = {}) => {
    const id = String(leadId);
    let lead = leads.find((l) => String(l.id) === id || String(l._dbId) === id);
    if (!lead) {
      for (const stage of PIPELINE_STAGES) {
        const fromCol = (grouped[stage.id] || []).find(
          (l) => String(l.id) === id || String(l._dbId) === id,
        );
        if (fromCol) {
          lead = fromCol;
          break;
        }
      }
    }
    if (!lead) {
      toast.error("This card can't be moved — it isn't linked to a CRM lead yet.");
      return;
    }
    if (!isDraggablePipelineLead(lead)) {
      toast.error("Link this Callyzer call to a lead before moving it.");
      return;
    }
    const currentStageId = resolveLeadKanbanColumn(lead, periodCalls, { scopeByAssignee: true });
    if (currentStageId === stageId) {
      if (scroll) scrollToStage(stageId);
      return;
    }
    const target = getStageMeta(stageId);
    const updated = patchLead(
      lead,
      { stage: stageId },
      `Moved to ${target.label}`,
      stageId === "payment_complete" ? "won" : "note",
    );
    applyLeadUpdate(updated);
    setGroupRev((v) => v + 1);
    const dbId = lead._dbId || leadId;
    if (dbId && String(dbId).match(/^\d+$/)) {
      const stageLabel = adminPipelineIdToDbStage(stageId);
      apiPatch(`/api/v1/leads/${dbId}/stage`, { stage: stageLabel, status: stageLabel }, {
        headers: getAdminCrmHeaders(),
      })
        .then(() => {
          invalidateCache("/api/v1");
          invalidatePipelineBoardCache("admin");
        })
        .catch(() => {
          apiPatch(`/api/dashboard/pipeline/leads/${dbId}`, { stage: stageId })
            .then(() => invalidateCache("/api/dashboard"))
            .catch(() => {});
        });
    }
    if (scroll) scrollToStage(stageId);
    toast.success(`Moved to ${target.label}`);
  };

  return (
    <div className="space-y-4 page-shell min-w-0">

      <GlassCard className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <StatCard
            label="Pipeline Value"
            value={formatPipelineValue(summary.value)}
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            change=""
            sub=""
          />
          <StatCard
            label="Total Leads"
            value={leadsLoading && !leads.length ? "…" : String(summary.total)}
            icon={Kanban}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            change={leadsLoading && !leads.length ? "Loading" : ""}
            sub={leadsLoading && !leads.length ? "fetching leads" : ""}
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
            label="Warm Leads"
            value={String(summary.warm)}
            icon={Thermometer}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            change="Medium intent"
            sub=""
          />
          <StatCard
            label="Cold Leads"
            value={String(summary.cold)}
            icon={Snowflake}
            iconBg="bg-sky-50"
            iconColor="text-sky-500"
            change="Low intent"
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
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1 border-t border-rose-50">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or company..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-rose-100 bg-white text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 shadow-sm shrink-0 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
        </div>

        <div className={`${SEGMENT_WRAP} w-full -mx-0.5`}>
          {PIPELINE_STAGES.map((stage) => {
            const columnLeads = grouped[stage.id] || [];
            const count = getStagePillCount(stage.id, columnLeads);
            const active = activeStage === stage.id;
            let callHint = null;
            if (stage.id === "conversation_2min") {
              callHint = `${syncedConversationCalls} calls ${CALL_CONVERSATION_LABEL} · ${columnLeads.length} leads with 2 min+`;
            } else if (stage.id === "not_pick") {
              callHint = `${syncedNotPickupCalls} client no pickup · ${columnLeads.length} leads in Not Pick`;
            } else if (stage.id === "meeting_booked") {
              callHint = `${periodMeetings.filter((m) => m.status !== "completed" && m.status !== "cancelled").length} scheduled`;
            } else if (stage.id === "meeting_done") {
              callHint = `${periodMeetings.filter((m) => m.status === "completed").length} completed`;
            }
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => scrollToStage(stage.id)}
                title={callHint || undefined}
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
        <p className="text-[10px] text-slate-400 px-0.5">
          {periodLabel} · Callyzer synced · {syncedConversationCalls} calls {CALL_CONVERSATION_LABEL} ({grouped.conversation_2min?.length || 0} leads) · {syncedNotPickupCalls} client no pickup ({grouped.not_pick?.length || 0} leads) · {periodMeetings.length} meetings
          {(callsSyncing) ? " · syncing in background…" : ""}
        </p>
      </GlassCard>

      <GlassCard className={`p-3 sm:p-4 overflow-hidden transition-opacity ${isBoardStale ? "opacity-70" : ""}`}>
        <p className="text-[10px] text-slate-400 mb-2.5 px-0.5">
          <span className="sm:hidden">Each stage is a row · swipe cards horizontally · tap for details</span>
          <span className="hidden sm:inline">Drag cards between columns · tap card for details</span>
        </p>

        {/* Mobile — one row per stage, horizontal card scroll within each row */}
        <div className="sm:hidden space-y-4">
          {PIPELINE_STAGES.map((stage) => {
            const columnLeads = grouped[stage.id] || [];
            const columnExpanded = Boolean(expandedColumns[stage.id]);
            const visibleLeads = visibleKanbanColumnLeads(columnLeads, columnExpanded);
            const hiddenCount = hiddenKanbanColumnCount(columnLeads, columnExpanded);
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
                  className="flex items-start justify-between gap-2 mb-2 px-0.5 text-left w-full min-h-[40px] hover:opacity-80 transition"
                >
                  <div className="min-w-0">
                    <Badge tone={stage.badgeTone}>{stage.label}</Badge>
                    <p className="text-[9px] text-slate-400 tabular-nums mt-0.5 h-[14px] leading-[14px]">
                      {columnLeads.length} leads
                    </p>
                  </div>
                  <span className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-700 grid place-items-center tabular-nums shrink-0">
                    {getColumnCount(stage.id, columnLeads)}
                  </span>
                </button>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropStageId(stage.id);
                  }}
                  onDragLeave={() => setDropStageId(null)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`rounded-xl border p-2 transition ${
                    isDropTarget
                      ? "border-rose-400 bg-rose-50/80 ring-2 ring-rose-200"
                      : "border-rose-100 bg-[#fffbfb]/80"
                  } flex flex-row gap-2 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-thin min-h-[108px] -mx-0.5 px-0.5`}
                >
                  {columnLeads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-rose-200 bg-white/60 p-4 text-center shrink-0 w-[min(72vw,200px)] min-h-[88px] flex items-center justify-center">
                      <p className="text-[11px] text-slate-400">No leads here</p>
                    </div>
                  ) : (
                    <>
                    {visibleLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        lastLabel={activityLabelMap.get(lead.id) ?? "—"}
                        isDragging={String(dragLeadId) === String(lead.id)}
                        onOpen={() => openLeadDetail(lead)}
                        onDragStart={() => setDragLeadId(lead.id)}
                        onDragEnd={() => setDragLeadId(null)}
                      />
                    ))}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedColumns((prev) => ({ ...prev, [stage.id]: true }))}
                        className="shrink-0 w-[min(72vw,200px)] rounded-xl border border-dashed border-rose-200 bg-white/80 px-3 py-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition"
                      >
                        Show {hiddenCount} more
                      </button>
                    )}
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Desktop — horizontal kanban columns, vertical card stack */}
        <div className="hidden sm:block overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1 snap-x snap-mandatory">
          <div className="flex items-start gap-3 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const columnLeads = grouped[stage.id] || [];
              const columnExpanded = Boolean(expandedColumns[stage.id]);
              const visibleLeads = visibleKanbanColumnLeads(columnLeads, columnExpanded);
              const hiddenCount = hiddenKanbanColumnCount(columnLeads, columnExpanded);
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
                    className="flex items-start justify-between gap-2 mb-2.5 px-0.5 text-left min-h-[40px] hover:opacity-80 transition"
                  >
                    <div className="min-w-0">
                      <Badge tone={stage.badgeTone}>{stage.label}</Badge>
                      <p className="text-[9px] text-slate-400 tabular-nums mt-0.5 h-[14px] leading-[14px]">
                        {columnLeads.length} leads
                      </p>
                    </div>
                    <span className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-700 grid place-items-center tabular-nums shrink-0">
                      {getColumnCount(stage.id, columnLeads)}
                    </span>
                  </button>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      handleDragEnter(stage.id);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.id)}
                    className={`rounded-xl border p-2 space-y-2 max-h-[calc(100dvh-400px)] min-h-[320px] overflow-y-auto overscroll-contain scrollbar-thin transition ${
                      isDropTarget
                        ? "border-rose-400 bg-rose-50/80 ring-2 ring-rose-200"
                        : "border-rose-100 bg-[#fffbfb]/80"
                    }`}
                  >
                    {columnLeads.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-rose-200 bg-white/60 p-4 text-center">
                        <p className="text-[11px] text-slate-400">Drop leads here</p>
                      </div>
                    ) : (
                      <>
                      {visibleLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          lastLabel={activityLabelMap.get(lead.id) ?? "—"}
                          isDragging={String(dragLeadId) === String(lead.id)}
                          onOpen={() => openLeadDetail(lead)}
                          onDragStart={() => setDragLeadId(lead.id)}
                          onDragEnd={() => setDragLeadId(null)}
                        />
                      ))}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedColumns((prev) => ({ ...prev, [stage.id]: true }))}
                          className="w-full rounded-xl border border-dashed border-rose-200 bg-white/80 px-3 py-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition"
                        >
                          Show {hiddenCount} more
                        </button>
                      )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <PipelineLeadDrawer
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        calls={periodCalls}
      />

      <AddLeadDrawer
        open={addOpen}
        onClose={handleAddClose}
        showToast={showToast}
        title="New Lead"
        subtitle="Add a lead directly to your pipeline board."
      />
    </div>
  );
}
