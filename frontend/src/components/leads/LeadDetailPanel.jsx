import toast from "react-hot-toast";
import {
  Phone, MessageCircle, Mail, Sparkles, Clock,
  Users, RefreshCw, Shuffle, ChevronDown, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LEAD_STATUS_LABELS,
  EMP_TEAM,
  EMP_LEAD_TEMPERATURES,
  phonesMatchLoose,
} from "../../data/employeeMock.js";
import { LeadStatusBadge, AvatarCircle, FormTextarea, BtnPrimary } from "../../employee/components/EmpUI.jsx";
import CashCollectedPanel from "../CashCollectedPanel.jsx";
import { CANONICAL_STAGE_LABELS, buildDetailDraft, unwrapApiList } from "../../lib/leadSync.js";
import { callFromApiLite } from "../../lib/callFromApiLite.js";
import { formatCallDisplayDate, formatCallDuration, isCallConnected } from "../../lib/callDisplay.js";
import { apiGet, apiPost } from "../../lib/api.js";
import { getCrmHeaders, getAdminCrmHeaders } from "../../lib/crmContext.js";

const TEMPERATURE_BTN_ACTIVE = {
  hot: "bg-rose-100 border-rose-200 text-rose-800 shadow-sm",
  warm: "bg-amber-100 border-amber-200 text-amber-800 shadow-sm",
  cold: "bg-sky-100 border-sky-200 text-sky-800 shadow-sm",
};

const CANONICAL_SERVICES = [
  "—",
  "AI Automation Suite",
  "CRM Setup & Onboarding",
  "Lead Gen Engine",
  "Custom Software Dev",
  "Strategic Consulting",
];

const fieldCardClass = "rounded-xl border border-rose-100 bg-[#fffbfb] p-3 shadow-[0_1px_2px_rgba(244,63,94,0.01)]";
const labelClass = "text-[9px] font-bold uppercase tracking-wider text-slate-400";
const inputClass = "w-full mt-1.5 text-xs font-bold text-slate-800 bg-white border border-rose-100 rounded-lg px-2 py-1.5 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-100";

function formatCallDate(value) {
  return formatCallDisplayDate(value);
}

function normalizeCallForDisplay(call, liveLead) {
  const mapped = call?.type ? call : callFromApiLite(call, [liveLead]);
  return {
    ...mapped,
    duration: isCallConnected(mapped) ? (mapped.duration || formatCallDuration(mapped.durationSec)) : "—",
    date: formatCallDate(mapped.callAt || mapped.startedAt || mapped.date),
    note: mapped.note || mapped.notes || mapped.aiSummary || mapped.ai_summary || "",
  };
}

function DetailField({ label, value, onChange, readOnly = false, type = "text", options }) {
  return (
    <div className={fieldCardClass}>
      <p className={labelClass}>{label}</p>
      {readOnly ? (
        <p className="text-xs font-black text-slate-800 mt-1.5 truncate">{value || "—"}</p>
      ) : options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

export default function LeadDetailPanel({
  liveLead,
  variant = "employee",
  readOnly: readOnlyProp,
  showReassignment = variant === "employee",
  onSave,
  onClose,
  calls = [],
  activities = {},
  employee,
  reassignLead,
  teamEmployees = [],
  refreshTeamEmployees,
  updateLeadTemperature,
  addActivityRecord,
  startCallyzerCall,
  onTemperatureChange,
  pipelineView = false,
  editLeadsHref = null,
}) {
  const navigate = useNavigate();
  const readOnly = readOnlyProp ?? variant === "admin";
  const viewOnlyPipeline = pipelineView && readOnly;
  const [draft, setDraft] = useState(() => buildDetailDraft(liveLead));
  const [saving, setSaving] = useState(false);
  const [notesList, setNotesList] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [fetchedCalls, setFetchedCalls] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);

  useEffect(() => {
    setDraft(buildDetailDraft(liveLead));
  }, [liveLead?.id, liveLead?.updatedAt, liveLead?.stage]);

  const crmHeaders = variant === "admin" ? getAdminCrmHeaders() : getCrmHeaders();

  useEffect(() => {
    if (viewOnlyPipeline || !readOnly || !liveLead?.id) return undefined;
    if (calls?.length) {
      setFetchedCalls([]);
      return undefined;
    }
    let cancelled = false;
    const leadDbId = liveLead._dbId || liveLead.id;
    (async () => {
      setCallsLoading(true);
      try {
        const res = await apiGet(`/api/v1/leads/${leadDbId}/calls?limit=200`, {
          headers: crmHeaders,
          cacheTtl: 30_000,
        });
        if (cancelled) return;
        const items = unwrapApiList(res) || [];
        setFetchedCalls(items.map((c) => callFromApiLite(c, [liveLead])));
      } catch {
        if (!cancelled) setFetchedCalls([]);
      } finally {
        if (!cancelled) setCallsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [readOnly, liveLead, calls?.length, crmHeaders, viewOnlyPipeline]);

  const resolvedCalls = useMemo(
    () => (calls?.length ? calls : fetchedCalls),
    [calls, fetchedCalls],
  );

  const leadCalls = useMemo(() => {
    const matched = resolvedCalls.filter((c) => {
      if (String(c.leadId) === String(liveLead.id) || String(c.leadId) === String(liveLead._dbId)) return true;
      if (liveLead.phone && c.phone && phonesMatchLoose(c.phone, liveLead.phone)) return true;
      if (liveLead.phone && c.clientPhone && phonesMatchLoose(c.clientPhone, liveLead.phone)) return true;
      return false;
    });
    return matched
      .map((c) => normalizeCallForDisplay(c, liveLead))
      .sort((a, b) => new Date(b.callAt || b.date || 0) - new Date(a.callAt || a.date || 0));
  }, [resolvedCalls, liveLead]);

  const leadActivities = activities[liveLead.id] || [];
  const currentAssignee = liveLead.assignee || employee?.name || "—";
  const isTemperatureStatus = ["hot", "warm", "cold"].includes(liveLead.status);

  const isDirty = useMemo(() => {
    if (readOnly) return false;
    const base = buildDetailDraft(liveLead);
    return Object.keys(base).some((key) => String(draft[key] ?? "") !== String(base[key] ?? ""));
  }, [draft, liveLead, readOnly]);

  const fetchNotes = async () => {
    try {
      setNoteLoading(true);
      const res = await apiGet(`/api/v1/leads/${liveLead.id}/notes`, { headers: crmHeaders });
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
    if (viewOnlyPipeline || !liveLead?.id) return undefined;
    fetchNotes();
  }, [liveLead?.id, variant, viewOnlyPipeline]);

  useEffect(() => {
    if (showReassignment && !teamEmployees.length && refreshTeamEmployees) {
      refreshTeamEmployees();
    }
  }, [showReassignment, teamEmployees.length, refreshTeamEmployees]);

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

  const handleSave = async () => {
    if (!onSave) return;
    try {
      setSaving(true);
      await onSave({
        phone: draft.phone,
        email: draft.email,
        pipelineStage: draft.stage,
        stage: draft.stage,
        source: draft.source,
        city: draft.city,
        company: draft.company,
        service: draft.service,
        requirements: draft.service,
        expectedRevenue: Number(draft.expectedRevenue) || 0,
      });
      toast.success("Lead details saved");
    } catch (err) {
      toast.error(err.message || "Failed to save lead details");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (e) => {
    if (e) e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setNoteSaving(true);
      const res = await apiPost(
        `/api/v1/leads/${liveLead.id}/notes`,
        { body: newNote.trim() },
        { headers: crmHeaders },
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

  const handleManualReassign = async (newAssignee) => {
    const emp = teamEmployees.find((e) => e.name === newAssignee)
      || EMP_TEAM.find((t) => t.name === newAssignee);
    if (!emp?.id) {
      toast.error("Could not find employee to assign");
      return;
    }
    const ok = await reassignLead(liveLead.id, emp.id, emp.name, "manual");
    if (!ok) return;
    addActivityRecord?.(liveLead.id, {
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
    addActivityRecord?.(liveLead.id, {
      type: "meeting",
      text: `Lead automatically reassigned to ${randomChoice.name} due to no pickup (Not Answered)`,
      time: "Just now",
    });
    toast.success(`Auto-reassigned to ${randomChoice.name}!`);
  };

  const handleSimulateCallNoAnswer = () => {
    toast.error("Call attempt: No Answer");
    setTimeout(handleAutoReassign, 1200);
  };

  const handleTemperatureChange = (nextStatus) => {
    if (!updateLeadTemperature || nextStatus === liveLead.status) return;
    const prevLabel = LEAD_STATUS_LABELS[liveLead.status] || liveLead.status;
    updateLeadTemperature(liveLead.id, nextStatus);
    addActivityRecord?.(liveLead.id, {
      type: "note",
      text: `Lead temperature changed from ${prevLabel} to ${LEAD_STATUS_LABELS[nextStatus]}`,
      time: "Just now",
    });
    toast.success(`Lead marked as ${LEAD_STATUS_LABELS[nextStatus]}`);
  };

  const patchDraft = (key) => (val) => setDraft((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5 animate-fade-in pb-6">
      {viewOnlyPipeline && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-950">
          <p className="font-bold">Pipeline view — read only</p>
          <p className="mt-1 leading-relaxed text-amber-900/90">
            {variant === "employee"
              ? "This Callyzer call is view-only on the pipeline. Ask admin to update name, service, and source on the Leads assignment page."
              : "New or Callyzer-only leads can be edited on the Leads assignment page (name, service, source, budget)."}
          </p>
          {editLeadsHref && variant === "admin" && (
            <button
              type="button"
              onClick={() => navigate(editLeadsHref)}
              className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-500 transition"
            >
              Edit on Leads page →
            </button>
          )}
        </div>
      )}
      <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/40 via-white to-rose-100/10 p-4 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-20 h-20 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-start gap-3">
          <AvatarCircle initials={liveLead.av} color={liveLead.color} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 font-semibold">{draft.company || liveLead.company}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {!isTemperatureStatus && (
                <LeadStatusBadge
                  status={liveLead.status}
                  label={LEAD_STATUS_LABELS[liveLead.status] || liveLead.stage || "Lead"}
                />
              )}
              {(updateLeadTemperature || onTemperatureChange) && !readOnly && (
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
                        onClick={() => {
                          if (updateLeadTemperature) {
                            handleTemperatureChange(id);
                          } else if (onTemperatureChange) {
                            onTemperatureChange(id);
                          }
                        }}
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
              )}
              {readOnly && isTemperatureStatus && (
                <LeadStatusBadge status={liveLead.status} label={LEAD_STATUS_LABELS[liveLead.status]} />
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-800">
 {currentAssignee}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Phone" value={draft.phone} onChange={patchDraft("phone")} readOnly={readOnly} />
        <DetailField label="Email" value={draft.email} onChange={patchDraft("email")} readOnly={readOnly} />
        <DetailField
          label="Stage"
          value={draft.stage}
          onChange={patchDraft("stage")}
          options={CANONICAL_STAGE_LABELS}
          readOnly={readOnly}
        />
        <DetailField label="Source" value={draft.source} onChange={patchDraft("source")} readOnly={readOnly} />
        <DetailField
          label="Budget (₹)"
          value={draft.expectedRevenue}
          onChange={patchDraft("expectedRevenue")}
          type="number"
          readOnly={readOnly}
        />
        <DetailField label="Last Contact" value={liveLead.last} readOnly />
        <DetailField label="Owner/Assignee" value={currentAssignee} readOnly />
        <DetailField
          label="Service"
          value={draft.service || "—"}
          onChange={patchDraft("service")}
          options={CANONICAL_SERVICES}
          readOnly={readOnly}
        />
        <DetailField label="City" value={draft.city} onChange={patchDraft("city")} readOnly={readOnly} />
        <DetailField label="Company" value={draft.company} onChange={patchDraft("company")} readOnly={readOnly} />
      </div>

      {isDirty && !readOnly && (
        <div className="flex justify-end">
          <BtnPrimary type="button" onClick={handleSave} disabled={saving} className="!py-2 !px-4">
            {saving ? "Saving…" : "Save Changes"}
          </BtnPrimary>
        </div>
      )}

      <CashCollectedPanel
        leadId={liveLead._dbId ?? liveLead.id}
        leadName={liveLead.name}
        employeeId={liveLead.assigneeId || employee?.id}
      />

      {showReassignment && reassignLead && (
        <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4 space-y-3.5 shadow-sm">
          <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-50 pb-2">
            <Users className="w-3.5 h-3.5 text-rose-500" /> Lead Routing & Reassignment
          </h4>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Manual Reassign</label>
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
          <div className="pt-2 border-t border-rose-50 space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0 mt-0.5">
                <Shuffle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-bold text-slate-700 leading-tight">No Pickup Auto-Routing</p>
                <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5 font-medium">
                  If lead does not answer, automatically transfer ownership to the next available agent.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAutoReassign}
                className="flex-1 py-2 rounded-xl bg-white border border-rose-200 text-[10.5px] font-bold text-slate-700 hover:bg-rose-50/30 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                Auto-Route Now
              </button>
              <button
                type="button"
                onClick={handleSimulateCallNoAnswer}
                className="flex-1 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[10.5px] font-bold text-rose-800 hover:bg-rose-100/50 transition-all flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                Trigger Call No-Answer
              </button>
            </div>
          </div>
        </div>
      )}

      {variant === "employee" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!liveLead?.phone) {
                toast.error("Phone number not found for this lead");
                return;
              }
              window.location.href = `tel:${liveLead.phone}`;
            }}
            className="flex-1 h-10 rounded-xl border border-rose-250 bg-white text-rose-800 hover:bg-rose-50/50 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Phone className="w-4 h-4 text-rose-600" /> Call
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (!liveLead?.phone) {
                toast.error("Phone number not found for this lead");
                return;
              }
              const cleanPhone = liveLead.phone.replace(/\D/g, "");
              const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
              window.open(`https://wa.me/${formatted}`, "_blank", "noopener,noreferrer");
            }}
            className="flex-1 h-10 rounded-xl border border-emerald-250 bg-emerald-50/10 text-emerald-800 hover:bg-emerald-50/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp
          </button>

          <button
            type="button"
            onClick={async () => {
              const session = await startCallyzerCall?.(liveLead);
              onClose?.();
              navigate(`/employee/call-assistant?leadId=${liveLead.id}&lead=${encodeURIComponent(liveLead.name)}`);
              if (session?.message) toast.success(session.message);
            }}
            className="flex-1 h-10 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-[0_4px_12px_rgba(220,38,38,0.2)] flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-white" /> Live Call
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4 space-y-3.5 shadow-sm">
        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-50 pb-2">
Lead Notes & Comments
        </label>
        {!readOnly && (
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
        )}
        {noteLoading ? (
          <div className="text-center py-2 text-[11px] text-slate-450">Loading notes...</div>
        ) : notesList.length === 0 ? (
          <p className="text-[10.5px] text-slate-400 italic pl-1">No notes saved for this lead.</p>
        ) : (
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
            {notesList.map((n) => (
              <div key={n.id} className="bg-white border border-rose-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                  <span>{n.authorType === "employee" ? "Employee" : "Admin"}</span>
                  <span>
                    {new Date(n.createdAt).toLocaleDateString()}{" "}
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-slate-750 leading-relaxed font-medium whitespace-pre-line">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-rose-100 bg-[#fffbfb] p-4.5 space-y-3 shadow-sm">
        <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-50 pb-2">
          <Clock className="w-3.5 h-3.5 text-rose-505" /> Recorded Call Logs & MoM
        </h4>
        {callsLoading ? (
          <p className="text-[11px] text-slate-450 italic pl-1 py-1">Loading call logs…</p>
        ) : leadCalls.length === 0 ? (
          <p className="text-[11px] text-slate-450 italic pl-1 py-1">No call logs registered for this lead.</p>
        ) : (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {leadCalls.map((c) => {
              const isIncoming = c.type === "in";
              const isMissed = c.type === "miss";
              const cardClass = "w-full text-left flex items-start justify-between gap-2.5 p-3 rounded-xl border border-rose-100 bg-white";
              const inner = (
                <>
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
                      <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">{c.note}</p>
                    )}
                    {!readOnly && c.note && (
                      <p className="text-[9.5px] text-rose-800 font-bold mt-1.5 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> View AI MoM & SOP Checklist
                      </p>
                    )}
                  </div>
                  <span className="text-[10.5px] font-black text-slate-750 shrink-0 bg-white border border-rose-100 px-1.5 py-0.5 rounded tabular-nums">
                    {c.duration}
                  </span>
                </>
              );
              if (readOnly) {
                return (
                  <div key={c.id} className={cardClass}>
                    {inner}
                  </div>
                );
              }
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate(`/employee/call-detail?id=${c.id}`);
                  }}
                  className={`${cardClass} hover:bg-rose-50/50 transition-all`}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {variant === "employee" && (
        <>
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
        </>
      )}
    </div>
  );
}
