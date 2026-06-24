import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, Kanban, Flame, Target, TrendingUp } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { GlassCard, Badge } from "../components/Primitives.jsx";
import AddLeadDrawer from "../components/AddLeadDrawer.jsx";
import PipelineLeadDrawer from "../components/pipeline/PipelineLeadDrawer.jsx";
import {
  PIPELINE_STAGES,
  PIPELINE_LEADS,
  PRIORITY_BADGE,
  formatPipelineValue,
  groupLeadsByStage,
  getPipelineSummary,
  getStageMeta,
  leadFromForm,
  patchLead,
  timeAgoShort,
} from "../data/pipelineMock.js";

function MetricTile({ label, value, sub, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-rose-100 bg-white/90 p-3 flex items-center justify-between gap-2 min-h-[72px]">
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[9px] font-bold text-emerald-600 mt-1">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${iconBg} ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

function LeadCard({ lead, onOpen, isDragging, onDragStart, onDragEnd }) {
  const priorityTone = PRIORITY_BADGE[lead.priority] || "muted";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/lead-id", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      className={`rounded-xl border border-rose-100 bg-white transition group ${
        isDragging ? "opacity-40 scale-[0.98]" : "hover:border-rose-300 hover:shadow-md"
      }`}
    >
      <button type="button" onClick={onOpen} className="w-full text-left p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-900 truncate group-hover:text-rose-800 transition">{lead.name}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{lead.company}</p>
          </div>
          <Badge tone={priorityTone}>{lead.priority}</Badge>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-rose-50">
          <span className="text-xs font-black text-rose-700 tabular-nums">{formatPipelineValue(lead.value)}</span>
          <span className="text-[9px] font-medium text-slate-400">{timeAgoShort(lead.updatedAt)}</span>
        </div>
      </button>
    </div>
  );
}

export default function Pipeline() {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState(PIPELINE_LEADS);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dragLeadId, setDragLeadId] = useState(null);
  const [dropStageId, setDropStageId] = useState(null);
  const columnRefs = useRef({});

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q),
    );
  }, [leads, search]);

  const grouped = useMemo(() => groupLeadsByStage(filtered), [filtered]);
  const summary = useMemo(() => getPipelineSummary(filtered), [filtered]);

  const scrollToStage = (stageId) => {
    setActiveStage(stageId);
    columnRefs.current[stageId]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  const handleUpdateLead = (updated) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  };

  const moveLeadToStage = (leadId, stageId, { scroll = true } = {}) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stageId) {
      if (scroll) scrollToStage(stageId);
      return;
    }
    const target = getStageMeta(stageId);
    const updated = patchLead(
      lead,
      { stage: stageId },
      `Moved to ${target.label}`,
      stageId === "closed_won" ? "won" : "note",
    );
    handleUpdateLead(updated);
    if (scroll) scrollToStage(stageId);
    toast.success(`Moved to ${target.label}`);
  };

  return (
    <div className="space-y-4 page-shell min-w-0">
      <Toaster position="top-right" />

      <GlassCard className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <MetricTile label="Pipeline Leads" value={String(summary.total)} icon={Kanban} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <MetricTile label="Active Deals" value={String(summary.active)} icon={Target} iconBg="bg-sky-50" iconColor="text-sky-600" />
          <MetricTile label="Hot Leads" value={String(summary.hot)} icon={Flame} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <MetricTile
            label="Pipeline Value"
            value={formatPipelineValue(summary.value)}
            sub={`${summary.winRate}% won · closed rate`}
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
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

        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin -mx-1 px-1">
          {PIPELINE_STAGES.map((stage) => {
            const count = grouped[stage.id]?.length ?? 0;
            const active = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => scrollToStage(stage.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition shrink-0 ${
                  active
                    ? "bg-rose-50 border-rose-400 text-rose-800 shadow-sm"
                    : "bg-white border-rose-100 text-slate-600 hover:border-rose-200 hover:bg-rose-50/50"
                }`}
              >
                {stage.label}
                <span className={`tabular-nums ${active ? "text-rose-600" : "text-slate-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-3 sm:p-4 overflow-hidden">
        <p className="text-[10px] text-slate-400 mb-2.5 px-0.5">
          Drag cards between columns · tap card for details
        </p>
        <div className="overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1 snap-x snap-mandatory">
          <div className="flex gap-3 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
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
                        <p className="text-[11px] text-slate-400">Drop leads here</p>
                      </div>
                    ) : (
                      columnLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          isDragging={dragLeadId === lead.id}
                          onOpen={() => setSelectedLead(lead)}
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

      <PipelineLeadDrawer
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        onUpdateLead={handleUpdateLead}
        onStageChange={scrollToStage}
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
