import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, Phone, CalendarClock, Play, Pause, Sparkles,
  CheckCircle, Circle, Star, Smile, AlertCircle, RefreshCw,
  Clock, RotateCcw, Volume2, ShieldCheck, HelpCircle, ChevronRight,
  User, CheckCircle2, History, ChevronDown, Pencil,
} from "lucide-react";
import { GlassCard, Badge } from "../../components/Primitives.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import {
  AvatarCircle, LeadStatusBadge, BtnPrimary, BtnSecondary, BtnGhost, EmpModal,
  FormInput, FormLabel, FormGroup, FormSelect, FormTextarea, FormRow
} from "../components/EmpUI.jsx";
import { LOCAL_SOPS } from "../../data/employeeMock.js";

// Helper to parse duration string (MM:SS or similar) into seconds
const parseDurationToSeconds = (durationStr) => {
  if (!durationStr || durationStr === "—") return 0;
  const parts = durationStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
};

// Helper to format seconds to MM:SS
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

// Map mood string to text + emoji + color theme
const MOOD_META = {
  hot: { label: "Hot Lead 🔥", bg: "bg-rose-50 border-rose-200 text-rose-700 font-bold" },
  warm: { label: "Warm Lead", bg: "bg-amber-50 border-amber-200 text-amber-700 font-bold" },
  cold: { label: "Cold Lead ❄", bg: "bg-sky-50 border-sky-200 text-sky-700 font-bold" },
  positive: { label: "Excited 😊", bg: "bg-emerald-50 border-emerald-250 text-emerald-700 font-bold" },
  neutral: { label: "Neutral 😐", bg: "bg-slate-50 border-slate-200 text-slate-600 font-bold" },
  negative: { label: "Hesitant 😟", bg: "bg-amber-50 border-amber-200 text-amber-700 font-bold" },
};

// Helper to resolve which SOP was used based on metadata / outcome
const getSopForCall = (call) => {
  if (call.sopId) return call.sopId;
  const company = (call.company || "").toLowerCase();
  const outcome = (call.outcome || "").toLowerCase();
  const name = (call.name || "").toLowerCase();
  
  if (company.includes("media") || company.includes("zee") || outcome.includes("zee") || outcome.includes("podcast")) {
    return 3; // Zee News Podcast Pitch
  }
  if (outcome.includes("bant") || outcome.includes("qualified") || name.includes("arun") || name.includes("priya")) {
    return 2; // BANT Qualification
  }
  return 1; // Intro & Cold Outreach (default)
};

// Helper to rebuild checklist questions asked vs unasked for historical calls
const getCheckedQuestionsForCall = (call, sops) => {
  if (call.checkedQuestions && Object.keys(call.checkedQuestions).length > 0) {
    return call.checkedQuestions;
  }

  const activeSopId = getSopForCall(call);
  const activeSop = sops.find((s) => s.id === activeSopId) || sops[0];
  if (!activeSop?.steps) return {};
  const checked = {};
  const outcome = (call.outcome || "").toLowerCase();
  
  if (
    outcome.includes("closed") || 
    outcome.includes("negotiation") || 
    outcome.includes("walkthrough") || 
    outcome.includes("pricing shared") || 
    outcome.includes("proposal discussed") || 
    outcome.includes("proposal review")
  ) {
    // Check all questions
    activeSop.steps.forEach((step) => {
      step.questions.forEach((q) => {
        checked[`${activeSopId}-${q.id}`] = true;
      });
    });
  } else if (
    outcome.includes("discovery") || 
    outcome.includes("demo scheduled") || 
    outcome.includes("qualified") || 
    outcome.includes("requirements") || 
    outcome.includes("budget confirmed")
  ) {
    // Check Opening & Discovery steps
    activeSop.steps.forEach((step) => {
      if (step.id === "opening" || step.id === "discovery" || step.id === "authority" || step.id === "need") {
        step.questions.forEach((q) => {
          checked[`${activeSopId}-${q.id}`] = true;
        });
      }
    });
  } else if (
    outcome.includes("intro") || 
    outcome.includes("engaged") || 
    outcome.includes("check-in") || 
    outcome.includes("attempted") || 
    outcome.includes("confirmed")
  ) {
    // Check Opening step only
    activeSop.steps.forEach((step) => {
      if (step.id === "opening") {
        step.questions.forEach((q) => {
          checked[`${activeSopId}-${q.id}`] = true;
        });
      }
    });
  }

  return checked;
};

const parseTime12 = (time24 = "14:00") => {
  const [hStr, mStr] = (time24 || "14:00").split(":");
  let h = parseInt(hStr || "14", 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { hour: String(h), minute: m, ampm };
};

const formatTime24 = (hour, minute, ampm) => {
  let h = parseInt(hour || "12", 10);
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const hStr = String(h).padStart(2, "0");
  return `${hStr}:${minute}`;
};

export default function EmployeeCallDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { calls = [], leads = [], addActivityRecord, scheduleFollowUp, editLeadDetails } = useEmployee();
  const callId = searchParams.get("id");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editStage, setEditStage] = useState("");

  // Find active call log record
  const call = useMemo(() => {
    if (!callId) return null;
    return calls.find((c) => String(c.id) === String(callId));
  }, [calls, callId]);

  // Find associated lead
  const lead = useMemo(() => {
    if (!call) return null;
    return leads.find((l) => String(l.id) === String(call.leadId));
  }, [leads, call]);

  // Find all calls for this lead (Call History)
  const leadCalls = useMemo(() => {
    if (!call) return [];
    if (call.leadId) {
      return calls.filter((c) => String(c.leadId) === String(call.leadId));
    }
    const leadPhone = lead?.phone || call.phone;
    if (leadPhone) {
      return calls.filter((c) => c.phone && String(c.phone) === String(leadPhone));
    }
    return [call];
  }, [calls, call, lead]);

  // Active SOP & compliance checklist calculations
  const activeSopId = useMemo(() => {
    if (!call) return 1;
    return getSopForCall(call);
  }, [call]);

  const activeSop = useMemo(() => {
    return LOCAL_SOPS.find((s) => s.id === activeSopId) || LOCAL_SOPS[0];
  }, [activeSopId]);

  const checkedQuestions = useMemo(() => {
    if (!call) return {};
    return getCheckedQuestionsForCall(call, LOCAL_SOPS);
  }, [call]);

  const complianceStats = useMemo(() => {
    if (!activeSop || !activeSop.steps) return { asked: 0, total: 0, pct: 0 };
    const allQs = activeSop.steps.reduce((acc, step) => [...acc, ...step.questions], []);
    if (allQs.length === 0) return { asked: 0, total: 0, pct: 0 };
    const asked = allQs.filter((q) => !!checkedQuestions[`${activeSopId}-${q.id}`]).length;
    return {
      asked,
      total: allQs.length,
      pct: Math.round((asked / allQs.length) * 100),
    };
  }, [activeSop, checkedQuestions, activeSopId]);

  // Visual audio player states
  const durationSec = useMemo(() => {
    if (!call) return 0;
    const parsed = parseDurationToSeconds(call.duration);
    if (call.recordingUrl) return parsed || 1;
    return parsed;
  }, [call]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= durationSec) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, durationSec]);

  // All Call Logs quick switch state
  const [allLogsOpen, setAllLogsOpen] = useState(false);

  // Follow-up scheduling modal states
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpType, setFollowUpType] = useState("Call");
  const [followUpNotes, setFollowUpNotes] = useState("");

  if (!call) {
    return (
      <div className="page-shell space-y-4">
        <BtnGhost onClick={() => navigate("/employee/calls")}>
          <ArrowLeft className="w-4 h-4" /> Back to Call Logs
        </BtnGhost>
        <GlassCard className="p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-full grid place-items-center text-3xl mx-auto">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-800">Call Log Not Found</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            The call log you are trying to view does not exist or has been deleted from local CRM storage.
          </p>
        </GlassCard>
      </div>
    );
  }

  const moodInfo = MOOD_META[call.mood] || MOOD_META.neutral;

  const handleSeekChange = (e) => {
    setCurrentTime(Number(e.target.value));
  };

  const handleScheduleConfirm = (e) => {
    e.preventDefault();
    if (!followUpDate || !followUpTime) {
      toast.error("Please specify both date and time");
      return;
    }

    // Add activity record
    addActivityRecord(call.leadId, {
      type: followUpType === "Call" ? "call" : followUpType === "Meeting" ? "meeting" : "whatsapp",
      text: `${followUpType} Follow-up scheduled for ${followUpDate} at ${followUpTime}. Note: ${followUpNotes || "No specific instructions"}`,
      time: "Scheduled just now",
    });

    scheduleFollowUp({
      leadName: call.name,
      company: call.company,
      type: followUpType,
      date: followUpDate,
      time: followUpTime,
      note: followUpNotes,
      leadId: call.leadId,
    });

    toast.success(`Follow-up scheduled — added to My Tasks for ${followUpDate}`);
    setIsFollowUpOpen(false);
    // Reset states
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpNotes("");
  };

  const handleCallAgain = () => {
    navigate(`/employee/call-assistant?lead=${encodeURIComponent(lead?.name || call.name)}`);
  };

  useEffect(() => {
    if (isEditOpen) {
      setEditName(lead?.name || call?.name || "");
      setEditStatus(lead?.status || "warm");
      setEditStage(lead?.pipelineStage || lead?.stage || "conversation");
    }
  }, [lead, isEditOpen, call?.name]);

  const handleEditConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!editName.trim()) {
      toast.error("Lead name cannot be empty");
      return;
    }

    if (lead) {
      try {
        await editLeadDetails(lead.id, {
          name: editName,
          status: editStatus,
          pipelineStage: editStage,
        });
        toast.success("Lead details updated successfully");
        setIsEditOpen(false);
      } catch (err) {
        toast.error(err.message || "Failed to update lead details");
      }
    } else if (call) {
      try {
        const { apiPost, apiPut } = await import("../../lib/api.js");
        const { getCrmHeaders } = await import("../../lib/crmContext.js");
        
        // 1. Create the lead
        const leadRes = await apiPost("/api/v1/leads", {
          leadName: editName.trim(),
          phone: call.phone || "",
          temperature: editStatus,
          pipelineStage: editStage,
          companyName: call.company || ""
        }, { headers: getCrmHeaders() });
        
        const newLead = leadRes?.data?.lead || leadRes?.lead || leadRes;
        if (!newLead?.id) {
          throw new Error("Failed to create new lead");
        }
        
        // 2. Associate the call log with the new lead
        await apiPut(`/api/v1/employee/calls/${call.id}`, {
          leadId: newLead.id
        }, { headers: getCrmHeaders() });
        
        toast.success("Lead created and call history linked successfully");
        setIsEditOpen(false);
        window.location.reload();
      } catch (err) {
        toast.error(err.message || "Failed to link and update lead");
      }
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (lead) {
      try {
        await editLeadDetails(lead.id, { status: newStatus });
        toast.success("Lead temperature updated successfully");
      } catch (err) {
        toast.error(err.message || "Failed to update temperature");
      }
    } else if (call) {
      try {
        const { apiPost, apiPut } = await import("../../lib/api.js");
        const { getCrmHeaders } = await import("../../lib/crmContext.js");
        
        const leadRes = await apiPost("/api/v1/leads", {
          leadName: call.name || "Unknown Lead",
          phone: call.phone || "",
          temperature: newStatus,
          pipelineStage: "conversation",
          companyName: call.company || ""
        }, { headers: getCrmHeaders() });
        
        const newLead = leadRes?.data?.lead || leadRes?.lead || leadRes;
        if (!newLead?.id) {
          throw new Error("Failed to create new lead");
        }
        
        await apiPut(`/api/v1/employee/calls/${call.id}`, {
          leadId: newLead.id
        }, { headers: getCrmHeaders() });
        
        toast.success("Lead created and temperature updated");
        window.location.reload();
      } catch (err) {
        toast.error(err.message || "Failed to link and update lead");
      }
    }
  };

  const handleStageChange = async (newStage) => {
    if (lead) {
      try {
        await editLeadDetails(lead.id, { pipelineStage: newStage });
        toast.success("Lead stage updated successfully");
      } catch (err) {
        toast.error(err.message || "Failed to update stage");
      }
    } else if (call) {
      try {
        const { apiPost, apiPut } = await import("../../lib/api.js");
        const { getCrmHeaders } = await import("../../lib/crmContext.js");
        
        const leadRes = await apiPost("/api/v1/leads", {
          leadName: call.name || "Unknown Lead",
          phone: call.phone || "",
          temperature: "warm",
          pipelineStage: newStage,
          companyName: call.company || ""
        }, { headers: getCrmHeaders() });
        
        const newLead = leadRes?.data?.lead || leadRes?.lead || leadRes;
        if (!newLead?.id) {
          throw new Error("Failed to create new lead");
        }
        
        await apiPut(`/api/v1/employee/calls/${call.id}`, {
          leadId: newLead.id
        }, { headers: getCrmHeaders() });
        
        toast.success("Lead created and stage updated");
        window.location.reload();
      } catch (err) {
        toast.error(err.message || "Failed to link and update lead");
      }
    }
  };

  const [notesList, setNotesList] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchNotes = async () => {
    if (!lead?.id) return;
    try {
      setNoteLoading(true);
      const { apiGet } = await import("../../lib/api.js");
      const { getCrmHeaders } = await import("../../lib/crmContext.js");
      const res = await apiGet(`/api/v1/leads/${lead.id}/notes`, {
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
    if (lead?.id) {
      fetchNotes();
    }
  }, [lead?.id]);

  const handleAddNote = async (e) => {
    if (e) e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setNoteSaving(true);
      const { apiPost } = await import("../../lib/api.js");
      const { getCrmHeaders } = await import("../../lib/crmContext.js");
      const res = await apiPost(
        `/api/v1/leads/${lead.id}/notes`,
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

  return (
    <div className="space-y-2 sm:space-y-4 page-shell min-w-0 animate-fade-in pb-12">

      {/* Top Navigation — single compact row */}
      <div className="rounded-xl sm:rounded-2xl border border-rose-100/60 bg-white p-2 sm:p-2.5 shadow-sm min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate("/employee/calls")}
              className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-rose-100/60 bg-white hover:bg-rose-50/40 text-slate-650 hover:text-rose-700 text-[11px] sm:text-xs font-bold transition shadow-sm shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to Call Logs</span>
            </button>

            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setAllLogsOpen(!allLogsOpen)}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-rose-100/60 bg-white hover:bg-rose-50/40 text-slate-650 hover:text-rose-700 text-[11px] sm:text-xs font-bold transition shadow-sm cursor-pointer max-w-[140px] sm:max-w-none truncate"
              >
                <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
                <span className="truncate">Call History</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
              {allLogsOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setAllLogsOpen(false)} />
                  <div className="absolute left-0 mt-1.5 w-[min(85vw,288px)] rounded-xl bg-white border border-rose-100 shadow-elegant p-2 z-30 max-h-72 sm:max-h-80 overflow-y-auto scrollbar-thin space-y-1 animate-fade-in">
                    <p className="text-[10px] text-slate-400 font-bold uppercase px-2 py-1 tracking-wider border-b border-rose-50 mb-1">
                      Call History
                    </p>
                    {leadCalls.map((c) => {
                      const isActive = String(c.id) === String(call.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setAllLogsOpen(false);
                            if (!isActive) navigate(`/employee/call-detail?id=${c.id}`);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium leading-snug flex items-center justify-between gap-1.5 transition-colors ${
                            isActive
                              ? "bg-rose-50 text-rose-700 font-bold"
                              : "text-slate-650 hover:bg-rose-50/50 hover:text-rose-850 cursor-pointer"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{lead?.name || c.name}</p>
                            <p className="text-[9.5px] text-slate-450 truncate mt-0.5">{c.date} · {c.outcome}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-slate-400 tracking-wider shrink-0 whitespace-nowrap tabular-nums">
            Call Ref: #{call.id}
          </span>
        </div>
      </div>

      {/* Header Info Banner Card */}
      <div className="bg-white rounded-2xl border border-rose-100/60 shadow-sm p-3 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-4">
          <AvatarCircle
            initials={lead?.av || (lead?.name || call.name).slice(0, 2).toUpperCase()}
            color={lead?.color || "#e11d48"}
            size={52}
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 leading-none">
                {lead?.name || call.name}
              </h2>
              {lead && <LeadStatusBadge status={lead.status} label={lead.status.toUpperCase()} />}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10.5px] ${moodInfo.bg}`}>
                {moodInfo.label}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 font-medium leading-none">
              {lead?.company || call.company} · {lead?.phone || call.phone || "+91 99999 99999"}
            </p>
            
            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-rose-500" /> {call.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold">
                <Volume2 className="w-3.5 h-3.5 text-rose-500" /> {call.type === "out" ? "Outbound Call" : "Inbound Call"}
              </span>
            </div>


          </div>
        </div>

        {/* Action Widgets */}
        <div className="flex sm:items-center gap-2.5 flex-wrap md:flex-nowrap shrink-0">
          <BtnSecondary className="!py-2 !rounded-xl !text-xs" onClick={() => setIsEditOpen(true)}>
            <Pencil className="w-4 h-4" /> Edit Details
          </BtnSecondary>
          <BtnSecondary className="!py-2 !rounded-xl !text-xs" onClick={() => setIsFollowUpOpen(true)}>
            <CalendarClock className="w-4 h-4" /> Schedule Follow-up
          </BtnSecondary>
          <BtnPrimary className="!py-2 !rounded-xl !text-xs" onClick={handleCallAgain}>
            <Phone className="w-4 h-4" /> Call Lead Again
          </BtnPrimary>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side: Audio Player & AI MoM (col-span-7) */}
        <div className="xl:col-span-7 flex flex-col gap-5">
          
          {/* Interactive Audio Player Card */}
          <GlassCard className="p-3 sm:p-4 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Voice Recording Playback
            </h3>
            
            {!call.recordingUrl && durationSec === 0 ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-5 text-center space-y-1.5">
                <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-650">No Recording Available</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Audio recordings are not registered for calls with no outcome or calls that were missed/rejected.
                </p>
              </div>
            ) : call.recordingUrl ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col gap-2.5">
                <audio controls preload="metadata" className="w-full" src={call.recordingUrl}>
                  Your browser does not support audio playback.
                </audio>
                <p className="text-[10px] text-slate-500 font-medium">
                  Recording synced from Callyzer for this lead call.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col gap-2.5">
                {/* Audio Waves Simulation */}
                <div className="h-6 flex items-center justify-between gap-[3px] px-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-50 via-transparent to-rose-50 pointer-events-none z-10" />
                  {Array.from({ length: 48 }).map((_, idx) => {
                    const isPassed = (idx / 48) * durationSec <= currentTime;
                    // Generate pseudo-random bar heights scaled to max 24px
                    const heights = [
                      8, 16, 10, 20, 14, 6, 12, 22, 9, 18, 14, 6,
                      16, 24, 11, 14, 20, 8, 16, 24, 10, 20, 12, 6,
                      18, 14, 9, 24, 16, 8, 11, 22, 14, 6, 18, 20
                    ];
                    const height = heights[idx % heights.length];
                    return (
                      <span
                        key={idx}
                        style={{ height: `${height}px` }}
                        className={`w-[3px] rounded-full transition-all duration-300 ${
                          isPassed ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-slate-200"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Progress Control slider */}
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min={0}
                    max={durationSec}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-rose-600 bg-rose-100 hover:bg-rose-250 focus:outline-none transition-colors"
                  />
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-500 font-medium">
                    <span>{formatTime(currentTime)}</span>
                    <span>{call.duration}</span>
                  </div>
                </div>

                {/* Playback Button Actions */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
                    className="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-650 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 grid place-items-center transition active:scale-95"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full gradient-primary text-white hover:opacity-95 shadow-[0_4px_12px_rgba(244,63,94,0.3)] grid place-items-center transition active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-4.5 h-4.5 fill-white" /> : <Play className="w-4.5 h-4.5 fill-white ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentTime(Math.min(durationSec, currentTime + 10))}
                    className="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-650 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 grid place-items-center transition active:scale-95"
                    title="Forward 10s"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* AI Minutes of Meeting (MoM) Card */}
          <div className="flex-1 bg-gradient-to-br from-rose-50/40 via-white to-rose-100/10 border border-rose-150/70 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute right-3 top-3 pointer-events-none opacity-20">
              <Sparkles className="w-12 h-12 text-rose-600 animate-pulse" />
            </div>

            <h3 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Sparkles className="w-4 h-4 text-rose-600 animate-pulse" /> AI Call Summary & MoM
            </h3>
            
            {call.note ? (
              <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin">
                <div className="text-xs text-slate-700 leading-relaxed font-medium bg-white/70 border border-rose-100/60 p-4 rounded-xl space-y-3 whitespace-pre-line shadow-[0_1px_3px_rgba(244,63,94,0.02)]">
                  {call.note}
                </div>
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-rose-200 rounded-xl grid place-items-center p-6 text-center text-slate-400 text-xs shrink-0">
                <HelpCircle className="w-7 h-7 text-rose-300" />
                <span>No AI summary notes recorded for this call log.</span>
              </div>
            )}
            
            {call.rating > 0 && (
              <div className="flex items-center justify-between border-t border-rose-100/60 pt-3 mt-1 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quality Audit Rating
                </span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-3.5 h-3.5 ${
                        idx < call.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lead Notes & Comments Card */}
          {lead && (
            <GlassCard className="p-4 sm:p-5 flex flex-col gap-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 shrink-0 border-b border-rose-50 pb-2">
                ✍️ Lead Notes & Comments
              </h3>
              
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
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
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
            </GlassCard>
          )}
        </div>

        {/* Right Side: SOP Compliance Checklist & Call History (col-span-5) */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          
          <GlassCard className="p-3 sm:p-4 md:p-5 flex flex-col h-[280px] sm:h-[400px] overflow-hidden shrink-0">
            {/* Header / Compliance Progress Widget */}
            <div className="shrink-0 space-y-3.5 border-b border-rose-100/60 pb-4 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">
                    SOP Compliance Audit
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Guidance: {activeSop.title} · {activeSop.category}
                  </p>
                </div>
                
                <span className="text-[10.5px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 tracking-wide shrink-0">
                  {complianceStats.asked}/{complianceStats.total} Asked
                </span>
              </div>

              {/* Progress Ring / Bar representation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-600" /> Script Adherence
                  </span>
                  <span className="font-black text-rose-700 font-mono">{complianceStats.pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${complianceStats.pct}%` }}
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full transition-all duration-1000 ease-out"
                  />
                </div>
              </div>
            </div>

            {/* Checklist Section scrolling */}
            <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin space-y-5">
              {activeSop.steps.map((step, stepIdx) => {
                // Check if any question in this step was asked
                const stepQuestions = step.questions || [];
                const askedInStep = stepQuestions.filter((q) => !!checkedQuestions[`${activeSopId}-${q.id}`]);
                const allAsked = askedInStep.length === stepQuestions.length;

                return (
                  <div key={step.id} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 border-b border-rose-50/70 pb-1 shrink-0">
                      <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold grid place-items-center shrink-0">
                          {stepIdx + 1}
                        </span>
                        {step.label}
                      </span>
                      <span className={`text-[10px] font-bold ${allAsked ? "text-emerald-600" : askedInStep.length > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {askedInStep.length}/{stepQuestions.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {stepQuestions.map((q) => {
                        const isAsked = !!checkedQuestions[`${activeSopId}-${q.id}`];
                        return (
                          <div
                            key={q.id}
                            className={`flex items-start gap-2.5 p-2 rounded-xl border text-[11.5px] leading-snug transition-colors ${
                              isAsked
                                ? "bg-emerald-50/30 border-emerald-100 text-slate-800"
                                : "bg-slate-50/40 border-slate-100 text-slate-450"
                            }`}
                          >
                            {isAsked ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className={isAsked ? "font-semibold" : "font-medium"}>
                                {q.text}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Call History Card */}
          <GlassCard className="p-3 sm:p-4 md:p-5 flex flex-col h-[260px] sm:h-[380px] shrink-0 overflow-hidden">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <History className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Lead Call History
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-3 shrink-0">
              Recorded calls for this lead. Select one to review its compliance checklist, summary, and audio.
            </p>
            
            <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin space-y-2 min-h-0">
              {leadCalls.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No other calls recorded for this lead.</p>
              ) : (
                leadCalls.map((c) => {
                  const isActive = String(c.id) === String(call.id);
                  const isIncoming = c.type === "in";
                  const isMissed = c.type === "miss";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (!isActive) {
                          navigate(`/employee/call-detail?id=${c.id}`);
                        }
                      }}
                      className={`w-full text-left flex items-start justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                        isActive
                          ? "border-rose-350 bg-rose-50/50 shadow-[0_2px_8px_rgba(244,63,94,0.05)] ring-1 ring-rose-100"
                          : "border-rose-100/70 bg-rose-50/10 hover:bg-rose-50 hover:border-rose-350 cursor-pointer"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            isIncoming ? "bg-emerald-50 text-emerald-700" : isMissed ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {isIncoming ? "Inbound" : isMissed ? "Missed" : "Outbound"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{c.date}</span>
                          {isActive && (
                            <span className="text-[9px] font-black text-rose-700 uppercase tracking-wide">
                              Viewing
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate mt-1.5">{c.outcome || "No outcome recorded"}</p>
                        {c.note && (
                          <p className="text-[9.5px] text-rose-800 font-bold mt-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-rose-600 animate-pulse" /> View AI MoM & SOP Checklist
                          </p>
                        )}
                      </div>
                      <span className="text-[10.5px] font-black text-slate-750 shrink-0 bg-white border border-rose-100 px-1.5 py-0.5 rounded tabular-nums">
                        {c.duration}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </GlassCard>

        </div>
      </div>

      {/* Interactive Scheduling Modal */}
      <EmpModal
        open={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title="Schedule Next Follow-Up Call"
        subtitle={`Set dates and targets for nurturing ${call.name}`}
        footer={
          <div className="flex items-center gap-2">
            <BtnGhost className="!py-1.5 !px-3" onClick={() => setIsFollowUpOpen(false)}>
              Cancel
            </BtnGhost>
            <BtnPrimary className="!py-1.5 !px-4" onClick={handleScheduleConfirm}>
              Schedule Call
            </BtnPrimary>
          </div>
        }
      >
        <form onSubmit={handleScheduleConfirm} className="space-y-4">
          <FormRow>
            <FormGroup>
              <FormLabel>Date *</FormLabel>
              <FormInput
                type="date"
                required
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </FormGroup>
            
            <FormGroup>
              <FormLabel>Time *</FormLabel>
              <div className="flex gap-1.5 items-center">
                <FormSelect
                  value={parseTime12(followUpTime || "09:00").hour}
                  onChange={(e) => {
                    const { minute, ampm } = parseTime12(followUpTime || "09:00");
                    const newTime = formatTime24(e.target.value, minute, ampm);
                    setFollowUpTime(newTime);
                  }}
                  className="flex-1 text-center"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </FormSelect>
                <span className="text-slate-400 font-bold">:</span>
                <FormSelect
                  value={parseTime12(followUpTime || "09:00").minute}
                  onChange={(e) => {
                    const { hour, ampm } = parseTime12(followUpTime || "09:00");
                    const newTime = formatTime24(hour, e.target.value, ampm);
                    setFollowUpTime(newTime);
                  }}
                  className="flex-1 text-center"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </FormSelect>
                <FormSelect
                  value={parseTime12(followUpTime || "09:00").ampm}
                  onChange={(e) => {
                    const { hour, minute } = parseTime12(followUpTime || "09:00");
                    const newTime = formatTime24(hour, minute, e.target.value);
                    setFollowUpTime(newTime);
                  }}
                  className="w-20 text-center"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </FormSelect>
              </div>
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <FormLabel>Follow-up Mode</FormLabel>
              <FormSelect value={followUpType} onChange={(e) => setFollowUpType(e.target.value)}>
                <option value="Call">Phone Call</option>
                <option value="WhatsApp">WhatsApp Chat</option>
                <option value="Meeting">Zoom / Google Meet</option>
                <option value="Email">Email Pitch</option>
              </FormSelect>
            </FormGroup>

            <FormGroup>
              <FormLabel>Lead Importance</FormLabel>
              <FormSelect defaultValue="high">
                <option value="high">High Urgency 🔥</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </FormSelect>
            </FormGroup>
          </FormRow>

          <FormGroup>
            <FormLabel>Follow-Up Instructions</FormLabel>
            <FormTextarea
              placeholder="e.g. Bring revised proposal, resolve ROI calculations, Pitch cross-sell bundle..."
              rows={3}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
            />
          </FormGroup>
        </form>
      </EmpModal>

      {/* Edit Details Modal */}
      <EmpModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Lead Details"
        subtitle="Update contact name, temperature status, and pipeline stage for this lead."
        footer={
          <div className="flex items-center gap-2">
            <BtnGhost className="!py-1.5 !px-3" onClick={() => setIsEditOpen(false)}>
              Cancel
            </BtnGhost>
            <BtnPrimary className="!py-1.5 !px-4" onClick={handleEditConfirm}>
              Save Changes
            </BtnPrimary>
          </div>
        }
      >
        <form onSubmit={handleEditConfirm} className="space-y-4">
          <FormGroup>
            <FormLabel>Lead Name</FormLabel>
            <FormInput
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter contact name"
              required
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Lead Status / Temperature</FormLabel>
            <FormSelect
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="hot">Hot Lead 🔥</option>
              <option value="warm">Warm Lead 😴</option>
              <option value="cold">Cold Lead ❄️</option>
              <option value="converted">Converted 💸</option>
              <option value="notpick">Not Picked ❌</option>
              <option value="ni">Not Interested 👎</option>
            </FormSelect>
          </FormGroup>
          <FormGroup>
            <FormLabel>Pipeline Stage</FormLabel>
            <FormSelect
              value={editStage}
              onChange={(e) => setEditStage(e.target.value)}
            >
              <option value="conversation">Conversation</option>
              <option value="booked">Booked</option>
              <option value="showed_up">Showed Up</option>
              <option value="proposal_sent">Proposal Sent</option>
            </FormSelect>
          </FormGroup>
        </form>
      </EmpModal>
    </div>
  );
}
