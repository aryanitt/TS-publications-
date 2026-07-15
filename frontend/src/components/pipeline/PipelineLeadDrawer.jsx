import { useEffect, useState, useMemo } from "react";
import {
  Phone, Mail, MapPin, Calendar, User, CheckCircle2, Circle,
  PhoneCall, Mail as MailIcon, StickyNote, Trophy, Plus, Trash2,
  Clock, Sparkles, Star, History, Flame, ShieldCheck, ChevronDown, Percent
} from "lucide-react";
import toast from "react-hot-toast";
import { Drawer, Badge } from "../Primitives.jsx";
import { apiGet, apiPost, apiPatch, invalidateCache } from "../../lib/api.js";
import {
  PIPELINE_STAGES,
  PRIORITY_BADGE,
  PRIORITY_OPTIONS,
  formatPipelineValue,
  getStageMeta,
  patchLead,
  timeAgoShort,
} from "../../data/pipelineMock.js";
import { getAssignmentState, getLeadEmployeeName } from "../../lib/leadAssignment.js";
import CashCollectedPanel from "../CashCollectedPanel.jsx";

const ACTIVITY_ICONS = {
  created: StickyNote,
  call: PhoneCall,
  email: MailIcon,
  meeting: Calendar,
  note: StickyNote,
  won: Trophy,
};

const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2";

const MOOD_META = {
  positive: { label: "Excited 😊", bg: "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold" },
  neutral: { label: "Neutral 😐", bg: "bg-slate-50 border-slate-200 text-slate-650 font-bold" },
  negative: { label: "Hesitant 😟", bg: "bg-amber-50 border-amber-200 text-amber-700 font-bold" },
};

export default function PipelineLeadDrawer({ open, onClose, lead, onUpdateLead, onStageChange }) {
  const [tab, setTab] = useState("details");
  const [newTask, setNewTask] = useState("");
  const [calls, setCalls] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const dbLeadId = lead?._dbId || lead?.id;
  const hasDbLead = dbLeadId && String(dbLeadId).match(/^\d+$/);

  useEffect(() => {
    if (open) {
      setTab("details");
      setNewTask("");

      const saved = localStorage.getItem("emp_calls_list");
      if (saved) {
        try {
          setCalls(JSON.parse(saved));
        } catch {
          setCalls([]);
        }
      } else {
        setCalls([]);
      }
    }
  }, [open, lead?.id]);

  useEffect(() => {
    if (!open || !lead || !hasDbLead) return;

    let cancelled = false;
    setTasksLoading(true);
    apiGet(`/api/dashboard/pipeline/leads/${dbLeadId}/tasks`, { skipCache: true, cacheTtl: 0 })
      .then((data) => {
        if (cancelled || !data?.success || !Array.isArray(data.tasks)) return;
        onUpdateLead({ ...lead, tasks: data.tasks });
      })
      .catch(() => {
        // keep tasks already on the lead object
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, lead?.id, dbLeadId, hasDbLead]);

  const leadCalls = useMemo(() => {
    if (!lead) return [];
    return calls.filter(
      (c) =>
        String(c.leadId) === String(lead.id) ||
        (c.name && lead.name && c.name.toLowerCase() === lead.name.toLowerCase())
    );
  }, [calls, lead]);

  if (!lead) return null;

  const employeeName = getLeadEmployeeName(lead, getAssignmentState());
  const stage = getStageMeta(lead.stage);
  const priorityTone = PRIORITY_BADGE[lead.priority] || "muted";

  const setPriority = (priority) => {
    if (priority === lead.priority) return;
    const updated = patchLead(lead, { priority }, `Temperature changed to ${priority}`);
    onUpdateLead(updated);
    toast.success(`Set to ${priority}`);
  };

  const setStage = (stageId) => {
    if (stageId === lead.stage) return;
    const target = getStageMeta(stageId);
    const updated = patchLead(
      lead,
      { stage: stageId },
      `Moved to ${target.label}`,
      stageId === "closed_won" ? "won" : "note",
    );
    onUpdateLead(updated);
    onStageChange?.(stageId, lead.id);
    toast.success(`Moved to ${target.label}`);
  };

  const leadTasks = lead.tasks || [];

  const toggleTask = async (taskId) => {
    const task = leadTasks.find((t) => t.id === taskId);
    const nextDone = !task?.done;

    onUpdateLead({
      ...lead,
      tasks: leadTasks.map((t) => (t.id === taskId ? { ...t, done: nextDone } : t)),
    });

    if (!hasDbLead) return;

    try {
      await apiPatch(`/api/dashboard/pipeline/leads/${dbLeadId}/tasks/${taskId}`, {
        status: nextDone ? "done" : "pending",
      });
      invalidateCache("/api/dashboard");
    } catch {
      toast.error("Could not update task");
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    const assigneeId = lead.assigneeId || lead.assignedTo?.id;
    if (hasDbLead && !assigneeId) {
      toast.error("Assign this lead to an employee before adding tasks");
      return;
    }

    if (hasDbLead && assigneeId) {
      try {
        const data = await apiPost(`/api/dashboard/pipeline/leads/${dbLeadId}/tasks`, {
          title: newTask.trim(),
          assigneeId,
        });
        if (data?.success && data.task) {
          onUpdateLead({
            ...lead,
            tasks: [...leadTasks, data.task],
          });
          setNewTask("");
          setTab("tasks");
          invalidateCache("/api/dashboard");
          toast.success("Task saved");
          return;
        }
      } catch {
        toast.error("Could not save task to server");
        return;
      }
    }

    onUpdateLead({
      ...lead,
      tasks: [...leadTasks, { id: Date.now(), text: newTask.trim(), done: false }],
    });
    setNewTask("");
    setTab("tasks");
    toast.success("Task added");
  };

  const removeTask = async (taskId) => {
    onUpdateLead({
      ...lead,
      tasks: leadTasks.filter((t) => t.id !== taskId),
    });

    if (!hasDbLead) return;

    try {
      await apiPatch(`/api/dashboard/pipeline/leads/${dbLeadId}/tasks/${taskId}`, {
        status: "cancelled",
      });
      invalidateCache("/api/dashboard");
      toast.success("Task removed");
    } catch {
      toast.error("Could not remove task");
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={lead.name} width="drawer-panel">
      <div className="space-y-4">
        {/* Redesigned Header Card with Glassmorphic gradient */}
        <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/40 via-white to-rose-100/10 p-5 relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start gap-4">
            {/* Elegant Circle initials avatar */}
            <div 
              className="w-12 h-12 rounded-xl grid place-items-center text-sm font-black text-white shrink-0 shadow-sm transition-all"
              style={{ 
                backgroundColor: lead.priority === "HOT" ? "#dc2626" : lead.priority === "WARM" ? "#f59e0b" : "#0ea5e9",
                boxShadow: lead.priority === "HOT" ? "0 4px 12px rgba(220,38,38,0.2)" : lead.priority === "WARM" ? "0 4px 12px rgba(245,158,11,0.2)" : "0 4px 12px rgba(14,165,233,0.2)"
              }}
            >
              {lead.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 leading-tight truncate">
                  {lead.name}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                  lead.priority === "HOT"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : lead.priority === "WARM"
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-sky-50 border-sky-200 text-sky-700"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {lead.priority}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">{lead.company}</p>
            </div>
          </div>

          {/* Cohesive Tag pills with icons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-rose-50/50">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-bold border transition ${
              stage.id === "closed_won" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50/50 border-rose-100 text-rose-800"
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" /> {stage.label}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-bold border bg-white border-rose-100 text-rose-700 shadow-[0_1px_2px_rgba(244,63,94,0.02)]">
              <Trophy className="w-3.5 h-3.5" /> {formatPipelineValue(lead.value)}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-bold border bg-slate-50 border-slate-200 text-slate-650">
              <Percent className="w-3.5 h-3.5" /> {lead.winProbability}% win
            </span>
          </div>
        </div>

        {/* Redesigned Control Card */}
        <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4.5 space-y-4.5 shadow-sm">
          <div>
            <label className={`${labelClass} !mb-2 flex items-center gap-1`}>
              <Flame className="w-3.5 h-3.5 text-rose-500" /> Lead Temperature
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white border border-rose-100">
              {PRIORITY_OPTIONS.map((p) => {
                const isActive = lead.priority === p;
                const activeClasses = 
                  p === "HOT"
                    ? "bg-rose-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.25)]"
                    : p === "WARM"
                    ? "bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.25)]"
                    : "bg-sky-500 text-white shadow-[0_2px_8px_rgba(14,165,233,0.25)]";

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 ${
                      isActive
                        ? activeClasses
                        : "text-slate-605 hover:bg-rose-50/50 hover:text-rose-800"
                    }`}
                  >
                    <span>{p === "HOT" ? "🔥" : p === "WARM" ? "⚡" : "❄️"}</span>
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={`${labelClass} !mb-2 flex items-center gap-1`}>
              <History className="w-3.5 h-3.5 text-rose-500" /> Pipeline Stage
            </label>
            <div className="relative">
              <select
                value={lead.stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full h-10.5 pl-3.5 pr-10 rounded-xl border border-rose-100 bg-white text-xs font-bold text-slate-800 outline-none appearance-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Board scrolls to the selected column automatically.
            </p>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-rose-50/50 border border-rose-100">
          {["details", "activity", "calls", "tasks"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[11px] font-bold capitalize rounded-lg transition ${
                tab === t
                  ? "bg-white text-rose-800 shadow-sm ring-1 ring-rose-200"
                  : "text-slate-500 hover:text-rose-700 hover:bg-white/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="space-y-4">
            {/* Contact Details Grid */}
            <div className="rounded-xl border border-rose-100 bg-[#fffbfb] p-4 grid grid-cols-2 gap-3.5">
              {/* Primary fields take full width */}
              <div className="col-span-2 flex items-start gap-3 pb-2 border-b border-rose-50/50">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 break-words">{lead.phone || "—"}</p>
                </div>
              </div>

              <div className="col-span-2 flex items-start gap-3 pb-2 border-b border-rose-50/50">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 break-words">{lead.email || "—"}</p>
                </div>
              </div>

              {/* Secondary fields in 2 columns */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">City</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{lead.city || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                  <StickyNote className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Source</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{lead.source || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Owner</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{employeeName || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Employee Name</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{employeeName || "Unassigned"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Next Follow-up</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{lead.nextFollowUp || "—"}</p>
                </div>
              </div>
            </div>

            <CashCollectedPanel
              leadId={dbLeadId || lead.id}
              leadName={lead.name}
              employeeId={lead.employeeId || lead.assignedTo}
              compact
            />

            {/* Latest Call MoM Section */}
            <div className="rounded-xl border border-rose-150/70 bg-gradient-to-br from-rose-50/20 via-white to-amber-50/10 p-4 space-y-3 relative overflow-hidden shadow-sm">
              <div className="absolute right-2 top-2 pointer-events-none opacity-10">
                <Sparkles className="w-10 h-10 text-rose-600 animate-pulse" />
              </div>

              <h4 className="text-[10px] font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-100/50 pb-2">
                <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Latest Call AI MoM
              </h4>

              {leadCalls.length > 0 ? (
                (() => {
                  const latestCall = leadCalls[0];
                  const moodInfo = MOOD_META[latestCall.mood] || MOOD_META.neutral;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-505 flex-wrap">
                        <span>By: <span className="font-bold text-slate-800">{employeeName || "Unassigned"}</span></span>
                        <span>Date: <span className="font-bold text-slate-800">{latestCall.date}</span></span>
                      </div>

                      {latestCall.note ? (
                        <div className="bg-white/90 border border-rose-50 p-3 rounded-lg text-[11.5px] leading-relaxed font-medium text-slate-650 shadow-[0_1px_3px_rgba(244,63,94,0.01)] whitespace-pre-line">
                          {latestCall.note}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-450 italic">No AI summary notes recorded for this call.</p>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] ${moodInfo.bg}`}>
                          {moodInfo.label}
                        </span>
                        
                        {latestCall.rating > 0 && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`w-3 h-3 ${
                                  idx < latestCall.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-3 text-slate-400 text-xs">
                  <PhoneCall className="w-5 h-5 text-rose-300 mx-auto mb-1.5" />
                  <span>No calls or AI MoM registered yet.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="rounded-xl border border-rose-100 bg-[#fffbfb] p-4 space-y-3">
            {lead.activities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No activity logged yet.</p>
            ) : (
              lead.activities.map((item) => {
                const Icon = ACTIVITY_ICONS[item.type] || StickyNote;
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 pb-3 border-b border-rose-50 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-slate-800">{item.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgoShort(item.at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "calls" && (
          <div className="space-y-4">
            {leadCalls.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rose-200 bg-[#fffbfb] p-6 text-center">
                <PhoneCall className="w-8 h-8 text-rose-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Call Logs</p>
                <p className="text-xs text-slate-400 mt-1">No call logs or AI MoMs recorded by employees for this lead.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[calc(100dvh-360px)] overflow-y-auto pr-1.5 scrollbar-thin">
                {leadCalls.map((c) => {
                  const isIncoming = c.type === "in";
                  const isMissed = c.type === "miss";
                  const moodInfo = MOOD_META[c.mood] || MOOD_META.neutral;
                  
                  return (
                    <div key={c.id} className="rounded-xl border border-rose-100 bg-white p-3.5 space-y-3 relative overflow-hidden shadow-sm">
                      {/* Top Header Row of the Call */}
                      <div className="flex items-center justify-between gap-2 border-b border-rose-50/70 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            isIncoming ? "bg-emerald-50 text-emerald-700" : isMissed ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {isIncoming ? "Inbound" : isMissed ? "Missed" : "Outbound"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-rose-500" /> {c.date}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-black text-slate-750 bg-white border border-rose-100 px-1.5 py-0.5 rounded tabular-nums">
                          {c.duration}
                        </span>
                      </div>

                      {/* Employee Contacting info */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-650">
                        <User className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Contacted By: <span className="font-bold text-slate-800">{employeeName || "Unassigned"}</span></span>
                      </div>

                      {/* Outcome and Mood */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="font-bold text-slate-800">
                          Outcome: <span className="text-rose-700 font-black">{c.outcome || "No outcome recorded"}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9.5px] ${moodInfo.bg}`}>
                          {moodInfo.label}
                        </span>
                      </div>

                      {/* AI Minutes of Meeting (MoM) note */}
                      {c.note ? (
                        <div className="bg-gradient-to-br from-rose-50/30 to-white border border-rose-100/60 p-3 rounded-lg space-y-1.5">
                          <div className="text-[9.5px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> AI Call Summary & MoM
                          </div>
                          <p className="text-[11.5px] text-slate-650 leading-relaxed font-medium whitespace-pre-line">
                            {c.note}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No notes recorded for this call.</p>
                      )}

                      {/* Quality Rating */}
                      {c.rating > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-rose-50/50 mt-1 text-[9.5px] font-bold text-slate-450 uppercase tracking-wider">
                          <span>Quality Audit Rating</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`w-3.5 h-3.5 ${
                                  idx < c.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add a task..."
                className="flex-1 h-10 px-3 rounded-xl border border-rose-100 bg-white text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={addTask}
                className="h-10 px-3 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 shrink-0 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {tasksLoading ? (
              <div className="rounded-xl border border-dashed border-rose-200 bg-[#fffbfb] p-6 text-center">
                <p className="text-sm text-slate-400">Loading tasks...</p>
              </div>
            ) : leadTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rose-200 bg-[#fffbfb] p-6 text-center">
                <p className="text-sm text-slate-400">No tasks yet.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {leadTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2.5"
                  >
                    <button type="button" onClick={() => toggleTask(task.id)} className="shrink-0">
                      {task.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${task.done ? "line-through text-slate-400" : "text-slate-800 font-medium"}`}>
                      {task.text}
                    </span>
                    <button type="button" onClick={() => removeTask(task.id)} className="text-slate-300 hover:text-rose-600 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
