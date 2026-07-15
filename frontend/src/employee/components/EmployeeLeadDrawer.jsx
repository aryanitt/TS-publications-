import toast from "react-hot-toast";
import { 
  Phone, MessageCircle, Mail, Sparkles, Clock, 
  User, Users, RefreshCw, Shuffle, ChevronDown 
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer } from "../../components/Primitives.jsx";
import { LEAD_STATUS_LABELS, EMP_TEAM, EMP_LEAD_TEMPERATURES, phonesMatchLoose } from "../../data/employeeMock.js";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import { LeadStatusBadge, AvatarCircle, FormLabel, FormTextarea, BtnPrimary } from "./EmpUI.jsx";
import CashCollectedPanel from "../../components/CashCollectedPanel.jsx";

const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2";

const TEMPERATURE_BTN_ACTIVE = {
  hot: "bg-rose-100 border-rose-200 text-rose-800 shadow-sm",
  warm: "bg-amber-100 border-amber-200 text-amber-800 shadow-sm",
  cold: "bg-sky-100 border-sky-200 text-sky-800 shadow-sm",
};

export default function EmployeeLeadDrawer({ lead, onClose }) {
  if (!lead) return null;
  const navigate = useNavigate();
  const {
    calls = [],
    activities = {},
    leads = [],
    employee,
    reassignLead,
    teamEmployees,
    refreshTeamEmployees,
    updateLeadTemperature,
    addActivityRecord,
    startCallyzerCall,
  } = useEmployee();

  const liveLead = useMemo(
    () => leads.find((l) => l.id === lead.id) || lead,
    [leads, lead],
  );

  const leadCalls = useMemo(() => {
    return calls.filter((c) => {
      if (String(c.leadId) === String(liveLead.id)) return true;
      if (liveLead.phone && c.phone && phonesMatchLoose(c.phone, liveLead.phone)) return true;
      return false;
    });
  }, [calls, liveLead.id, liveLead.phone]);

  const leadActivities = useMemo(() => {
    return activities[liveLead.id] || [];
  }, [activities, liveLead.id]);

  const [notesList, setNotesList] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      setNoteLoading(true);
      const { apiGet } = await import("../../lib/api.js");
      const { getCrmHeaders } = await import("../../lib/crmContext.js");
      const res = await apiGet(`/api/v1/leads/${liveLead.id}/notes`, {
        headers: getCrmHeaders(),
      });
      if (res?.success !== false) {
        setNotesList(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.error("Failed to fetch lead notes", err);
    } finally {
      setNoteLoading(false);
    }
  };

  useEffect(() => {
    if (liveLead?.id) {
      fetchNotes();
    }
  }, [liveLead?.id]);

  const handleAddNote = async (e) => {
    if (e) e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setNoteSaving(true);
      const { apiPost } = await import("../../lib/api.js");
      const { getCrmHeaders } = await import("../../lib/crmContext.js");
      const res = await apiPost(
        `/api/v1/leads/${liveLead.id}/notes`,
        { body: newNote.trim() },
        { headers: getCrmHeaders() }
      );
      if (res) {
        toast.success("Note added successfully");
        setNewNote("");
        fetchNotes();
      }
    } catch (err) {
      toast.error(err.message || "Failed to add note");
    } finally {
      setNoteSaving(false);
    }
  };

  useEffect(() => {
    if (!teamEmployees.length && refreshTeamEmployees) {
      refreshTeamEmployees();
    }
  }, [teamEmployees.length, refreshTeamEmployees]);

  const currentAssignee = liveLead.assignee || employee?.name || "—";

  const reassignOptions = useMemo(() => {
    const source = teamEmployees.length
      ? teamEmployees
      : EMP_TEAM.map((t, i) => ({ id: i + 1, name: t.name }));
    const byName = new Map(source.filter((e) => e?.name).map((e) => [e.name, e]));
    if (currentAssignee && currentAssignee !== "—" && !byName.has(currentAssignee)) {
      byName.set(currentAssignee, { id: `assignee-${currentAssignee}`, name: currentAssignee });
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [teamEmployees, currentAssignee]);

  const handleManualReassign = async (newAssignee) => {
    const emp = teamEmployees.find((e) => e.name === newAssignee)
      || EMP_TEAM.find((t) => t.name === newAssignee);
    if (!emp?.id) {
      toast.error("Could not find employee to assign");
      return;
    }
    const ok = await reassignLead(liveLead.id, emp.id, emp.name, "manual");
    if (!ok) return;
    addActivityRecord(liveLead.id, {
      type: "meeting",
      text: `Lead manually reassigned to ${newAssignee} by ${employee?.name || "You"}`,
      time: "Just now",
    });
    toast.success(`Assigned to ${newAssignee}`);
  };

  const handleAutoReassign = async () => {
    const pool = teamEmployees.length
      ? teamEmployees.filter((e) => e.name !== currentAssignee)
      : EMP_TEAM.filter((t) => t.name !== currentAssignee);
    if (pool.length === 0) return;
    const randomChoice = pool[Math.floor(Math.random() * pool.length)];

    const ok = await reassignLead(liveLead.id, randomChoice.id, randomChoice.name, "auto");
    if (!ok) return;
    addActivityRecord(liveLead.id, {
      type: "meeting",
      text: `Lead automatically reassigned to ${randomChoice.name} due to no pickup (Not Answered)`,
      time: "Just now",
    });
    toast.success(`Auto-reassigned to ${randomChoice.name}!`);
  };

  const handleSimulateCallNoAnswer = () => {
    toast.error("Call attempt: No Answer 🚫");
    setTimeout(() => {
      handleAutoReassign();
    }, 1200);
  };

  const handleTemperatureChange = (nextStatus) => {
    if (nextStatus === liveLead.status) return;
    const prevLabel = LEAD_STATUS_LABELS[liveLead.status] || liveLead.status;
    updateLeadTemperature(liveLead.id, nextStatus);
    addActivityRecord(liveLead.id, {
      type: "note",
      text: `Lead temperature changed from ${prevLabel} to ${LEAD_STATUS_LABELS[nextStatus]}`,
      time: "Just now",
    });
    toast.success(`Lead marked as ${LEAD_STATUS_LABELS[nextStatus]}`);
  };

  const isTemperatureStatus = ["hot", "warm", "cold"].includes(liveLead.status);

  return (
    <Drawer open={!!lead} onClose={onClose} title={liveLead.name}>
      <div className="space-y-5 animate-fade-in pb-6">
        
        {/* Redesigned Header: Glassmorphic with dynamic status */}
        <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/40 via-white to-rose-100/10 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-20 h-20 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-start gap-3">
            <AvatarCircle initials={liveLead.av} color={liveLead.color} size={48} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 font-semibold">{liveLead.company}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {!isTemperatureStatus && (
                  <LeadStatusBadge status={liveLead.status} label={LEAD_STATUS_LABELS[liveLead.status] || liveLead.stage || "Lead"} />
                )}
                <div
                  className="inline-flex gap-0.5 p-0.5 rounded-lg bg-white/90 border border-rose-100 shrink-0"
                  role="group"
                  aria-label="Lead temperature"
                >
                  {EMP_LEAD_TEMPERATURES.map(({ id, label }) => {
                    const active = liveLead.status === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleTemperatureChange(id)}
                        aria-pressed={active}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition ${
                          active
                            ? TEMPERATURE_BTN_ACTIVE[id]
                            : "bg-transparent border-transparent text-slate-500 hover:bg-rose-50/50 hover:text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-805">
                  👤 {currentAssignee}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { lbl: "Phone", val: liveLead.phone || "—" },
            { lbl: "Email", val: liveLead.email || "—" },
            { lbl: "Stage", val: liveLead.stage },
            { lbl: "Source", val: liveLead.source },
            { lbl: "Budget", val: liveLead.budget },
            { lbl: "Last Contact", val: liveLead.last },
            { lbl: "Owner/Assignee", val: currentAssignee },
            { lbl: "Services", val: liveLead.service || "—" },
            { lbl: "City", val: liveLead.city || "—" },
          ].map(({ lbl, val }) => (
            <div key={lbl} className="rounded-xl border border-rose-100 bg-[#fffbfb] p-3 shadow-[0_1px_2px_rgba(244,63,94,0.01)]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{lbl}</p>
              <p className="text-xs font-black text-slate-800 mt-1.5 truncate">{val}</p>
            </div>
          ))}
        </div>

        <CashCollectedPanel
          leadId={liveLead.id}
          leadName={liveLead.name}
          employeeId={liveLead.assigneeId || employee?.id}
        />

        {/* Reassignment Routing Panel */}
        <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4 space-y-3.5 shadow-sm">
          <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-50 pb-2">
            <Users className="w-3.5 h-3.5 text-rose-500" /> Lead Routing & Reassignment
          </h4>

          {/* Manual Selector */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              Manual Reassign
            </label>
            <div className="relative">
              <select
                value={currentAssignee}
                onChange={(e) => handleManualReassign(e.target.value)}
                className="w-full h-9.5 pl-3.5 pr-10 rounded-xl border border-rose-100 bg-white text-xs font-bold text-slate-850 outline-none appearance-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition cursor-pointer"
              >
                {reassignOptions.map((t) => (
                  <option key={t.id ?? t.name} value={t.name}>
                    {t.name}{" "}
                    {(t.id === employee?.id || t.name === employee?.name) ? "(You)" : ""}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Auto Reassign Trigger */}
          <div className="pt-2 border-t border-rose-50 space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0 mt-0.5">
                <Shuffle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-bold text-slate-700 leading-tight">No Pickup Auto-Routing</p>
                <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5 font-medium">
                  If lead does not answer, automatically transfer ownership to the next available agent to maximize calling efficiency.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAutoReassign}
                className="flex-1 py-2 rounded-xl bg-white border border-rose-200 text-[10.5px] font-bold text-slate-700 hover:bg-rose-50/30 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                Auto-Route Now
              </button>
              
              <button
                type="button"
                onClick={handleSimulateCallNoAnswer}
                className="flex-1 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[10.5px] font-bold text-rose-800 hover:bg-rose-100/50 hover:border-rose-350 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                Trigger Call No-Answer
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons (Call, WhatsApp, Email) */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={async () => {
              const session = await startCallyzerCall(liveLead);
              onClose();
              const leadQuery = encodeURIComponent(liveLead.name);
              const leadIdQuery = `leadId=${liveLead.id}`;
              navigate(`/employee/call-assistant?${leadIdQuery}&lead=${leadQuery}`);
              if (session?.message) toast.success(session.message);
            }}
            className="flex-1 h-10 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-[0_4px_12px_rgba(220,38,38,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Phone className="w-4 h-4 fill-white" /> Call
          </button>
          
          <button
            type="button"
            onClick={() => toast.success(`WhatsApp chat opened for ${liveLead.name}`)}
            className="flex-1 h-10 rounded-xl bg-white border border-rose-200 hover:bg-rose-50/30 hover:border-rose-300 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(244,63,94,0.01)]"
          >
            <MessageCircle className="w-4 h-4 text-rose-500" /> WhatsApp
          </button>

          <button
            type="button"
            onClick={() => toast.success(`Email draft created for ${liveLead.name}`)}
            className="flex-1 h-10 rounded-xl bg-white border border-rose-200 hover:bg-rose-50/30 hover:border-rose-300 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(244,63,94,0.01)]"
          >
            <Mail className="w-4 h-4 text-rose-500" /> Email
          </button>
        </div>

        {/* Quick Notes / Add Note Section */}
        <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4 space-y-3.5 shadow-sm">
          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-50 pb-2">
            ✍️ Lead Notes & Comments
          </label>
          
          <form onSubmit={handleAddNote} className="space-y-2">
            <FormTextarea
              rows={2}
              placeholder="Type a note or call details..."
              className="!rounded-xl border-rose-100/60 focus:border-rose-400 text-xs"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <BtnPrimary type="submit" className="!py-1.5 !px-3 !text-[10.5px]" disabled={noteSaving}>
                {noteSaving ? "Saving..." : "Add Note"}
              </BtnPrimary>
            </div>
          </form>

          {noteLoading ? (
            <div className="text-center py-2 text-[11px] text-slate-450">Loading notes...</div>
          ) : notesList.length === 0 ? (
            <p className="text-[10.5px] text-slate-400 italic pl-1">No notes saved for this lead.</p>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
              {notesList.map((n) => (
                <div key={n.id} className="bg-white border border-rose-50 rounded-xl p-2.5 space-y-1 text-[11px] shadow-[0_1px_2px_rgba(244,63,94,0.01)]">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                    <span>👤 {n.authorType === "employee" ? "You" : "Admin"}</span>
                    <span>{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-750 leading-relaxed font-medium whitespace-pre-line">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Calls & MoM section */}
        <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4.5 space-y-3 shadow-sm">
          <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-50 pb-2">
            <Clock className="w-3.5 h-3.5 text-rose-505" /> Recorded Call Logs & MoM
          </h4>
          
          {leadCalls.length === 0 ? (
            <p className="text-[11px] text-slate-450 italic pl-1 py-1">No call logs registered for this lead.</p>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {leadCalls.map((c) => {
                const isIncoming = c.type === "in";
                const isMissed = c.type === "miss";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/employee/call-detail?id=${c.id}`);
                    }}
                    className="w-full text-left flex items-start justify-between gap-2.5 p-3 rounded-xl border border-rose-100 bg-white hover:bg-rose-50/50 hover:border-rose-350 transition-all cursor-pointer shadow-[0_1px_3px_rgba(244,63,94,0.01)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          isIncoming ? "bg-emerald-50 text-emerald-700" : isMissed ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {isIncoming ? "Inbound" : isMissed ? "Missed" : "Outbound"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{c.date}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate mt-2">{c.outcome}</p>
                      {c.note && (
                        <p className="text-[9.5px] text-rose-800 font-bold mt-1.5 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> View AI MoM & SOP Checklist
                        </p>
                      )}
                    </div>
                    <span className="text-[10.5px] font-black text-slate-750 shrink-0 bg-white border border-rose-100 px-1.5 py-0.5 rounded tabular-nums">
                      {c.duration}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Lead Activity Timeline */}
        <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4.5 space-y-3 shadow-sm">
          <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-50 pb-2">
            <Clock className="w-3.5 h-3.5 text-rose-505" /> Activity History
          </h4>
          
          {leadActivities.length === 0 ? (
            <p className="text-[11px] text-slate-450 italic pl-1 py-1">No activities logged yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
              {leadActivities.map((a, idx) => (
                <div key={idx} className="flex gap-2.5 py-2.5 border-b border-rose-50 last:border-0 items-start">
                  <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-750 leading-snug">{a.text}</p>
                    <p className="text-[9.5px] text-slate-450 font-bold mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
