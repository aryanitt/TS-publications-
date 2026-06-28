import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar, CalendarClock, CheckCircle2, Copy, ExternalLink, History, Link2, Plus,
  Search, Sparkles, Trash2, Video, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard, StatCard, Badge, Drawer } from "../../components/Primitives.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../../lib/segmentPills.js";
import {
  MEETING_PLATFORMS,
  generateGoogleMeetLink,
  getEmpAppToday,
} from "../../data/employeeMock.js";
import {
  BtnPrimary, BtnSecondary, EmpEmptyState, AvatarCircle,
} from "../components/EmpUI.jsx";


const PLATFORM_TONE = {
  "Google Meet": "success",
  Zoom: "info",
  Teams: "purple",
};

const PANEL_HEIGHT = "min-h-[240px] max-h-[min(420px,calc(100dvh-280px))] sm:max-h-[calc(100dvh-240px)] sm:min-h-[280px]";

const EMPTY_FORM = {
  title: "",
  date: getEmpAppToday(),
  time: "14:00",
  leadId: "",
  platform: "google_meet",
  meetLink: "",
  agenda: "",
};

const INPUT = "w-full h-10 px-3 rounded-xl bg-white border border-rose-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition";
const LABEL = "block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function BookMeetingDrawer({
  open,
  form,
  setForm,
  leads,
  employee,
  selectedPlatform,
  onClose,
  onCreate,
  onGenerateLink,
  onCopyLink,
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Book a Meeting" width="drawer-panel">
      <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-rose-50">
        Schedule with Zoom, Google Meet, or Microsoft Teams
      </p>

      <div className="flex items-center gap-2 rounded-xl bg-rose-50/70 border border-rose-100 px-3 py-2 mb-5">
        <AvatarCircle initials={employee.initials} color="#be123c" size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 truncate">{employee.name}</p>
          <p className="text-[10px] text-slate-500">Meeting host</p>
        </div>
        <Badge tone="primary">Host</Badge>
      </div>

      <div className="space-y-4">
        <Field label="Meeting Title">
          <input
            className={INPUT}
            placeholder="Discovery Call — Rajesh Mehta"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" className={INPUT} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Time">
            <input type="time" className={INPUT} value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Lead">
            <select className={INPUT} value={form.leadId} onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))} required>
              <option value="">Select lead…</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}{l.company ? ` — ${l.company}` : ""}</option>
              ))}
            </select>
            {leads.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">No leads loaded — add or assign leads first.</p>
            )}
          </Field>
          <Field label="Platform">
            <select
              className={INPUT}
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            >
              {MEETING_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.label.replace(" Meeting", "").replace("Microsoft ", "")}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={form.platform === "google_meet" ? "Google Meet Link" : "Meeting Link"}>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400 pointer-events-none" />
              <input
                className={`${INPUT} !pl-9 font-mono text-xs`}
                placeholder={selectedPlatform.placeholder}
                value={form.meetLink}
                onChange={(e) => setForm((f) => ({ ...f, meetLink: e.target.value }))}
              />
            </div>
            {selectedPlatform.canGenerate && (
              <button
                type="button"
                onClick={onGenerateLink}
                className="h-10 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shrink-0 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate
              </button>
            )}
            {form.meetLink && (
              <button
                type="button"
                onClick={() => onCopyLink(form.meetLink)}
                className="h-10 w-10 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shrink-0 grid place-items-center"
                aria-label="Copy link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </Field>

        <Field label="Agenda">
          <textarea
            rows={3}
            className={`${INPUT} !h-auto py-2.5 resize-none`}
            placeholder="Objectives, talking points…"
            value={form.agenda}
            onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
          />
        </Field>
      </div>

      <div className="sticky bottom-0 -mx-4 sm:-mx-5 px-4 sm:px-5 py-4 mt-6 bg-white border-t border-rose-100 flex flex-wrap gap-2">
        <BtnPrimary onClick={onCreate} className="flex-1 sm:flex-initial">
          <CheckCircle2 className="w-4 h-4" /> Create & Send
        </BtnPrimary>
        {form.meetLink && form.platform === "google_meet" && (
          <BtnSecondary onClick={() => window.open(form.meetLink, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="w-4 h-4" /> Preview
          </BtnSecondary>
        )}
        <BtnSecondary onClick={onClose} className="sm:ml-auto">
          <X className="w-4 h-4" /> Cancel
        </BtnSecondary>
      </div>
    </Drawer>
  );
}

function leadInitials(name) {
  if (!name || name === "—") return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function PlatformBadge({ platform }) {
  return <Badge tone={PLATFORM_TONE[platform] || "muted"}>{platform}</Badge>;
}

function ScheduleItem({ meeting, onJoin, onCopyLink, onDelete }) {
  return (
    <div className="px-3 py-3 hover:bg-rose-50/50 transition group">
      <div className="flex gap-2.5">
        <AvatarCircle initials={leadInitials(meeting.lead)} color="#be123c" size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold text-slate-900 truncate">{meeting.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              <PlatformBadge platform={meeting.platform} />
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(meeting.id)}
                  className="p-1 rounded-lg text-slate-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  aria-label="Delete meeting"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{meeting.time}</p>
          <p className="text-[10px] font-semibold text-slate-700 mt-0.5 truncate">{meeting.lead}</p>
          <div className="flex gap-1.5 mt-2">
            <BtnPrimary className="!py-1 !px-2.5 !text-[10px] !rounded-lg" onClick={() => onJoin(meeting)}>
              <Video className="w-3 h-3" /> Join
            </BtnPrimary>
            {meeting.meetLink && (
              <BtnSecondary className="!py-1 !px-2 !text-[10px] !rounded-lg" onClick={() => onCopyLink(meeting.meetLink)} aria-label="Copy link">
                <Copy className="w-3 h-3" />
              </BtnSecondary>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TodaySchedulePanel({ upcoming, history, onJoin, onCopyLink, onDelete }) {
  return (
    <GlassCard className={`p-0 overflow-hidden flex flex-col ${PANEL_HEIGHT}`}>
      <div className="px-4 py-3 border-b border-rose-50 bg-rose-50/40 shrink-0">
        <p className="text-sm font-black text-slate-900">Today&apos;s Schedule</p>
        <p className="text-[10px] text-slate-500">{upcoming.length} upcoming · quick join</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin divide-y divide-rose-50">
        {upcoming.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="w-8 h-8 text-rose-200 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">No meetings today</p>
            <p className="text-[10px] text-slate-400 mt-1">Book one to get started</p>
          </div>
        ) : (
          upcoming.map((m) => (
            <ScheduleItem key={m.id} meeting={m} onJoin={onJoin} onCopyLink={onCopyLink} onDelete={onDelete} />
          ))
        )}

        {history.length > 0 && (
          <div className="border-t border-rose-100 bg-slate-50/50">
            <p className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Recent</p>
            <div className="divide-y divide-rose-50 pb-2">
              {history.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{m.title}</p>
                    <p className="text-[9px] text-slate-400">{m.time}</p>
                  </div>
                  <Badge tone="success">{m.outcome}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function UpcomingCard({ meeting, onJoin, onCopyLink, onDelete }) {
  return (
    <article className="group rounded-2xl border border-rose-100/80 bg-white p-4 hover:border-rose-200 hover:shadow-[0_8px_24px_rgba(244,63,94,0.06)] transition-all">
      <div className="flex gap-3">
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 grid place-items-center shrink-0">
          <Video className="w-4 h-4 text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate group-hover:text-rose-900 transition">{meeting.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{meeting.time}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <PlatformBadge platform={meeting.platform} />
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(meeting.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  aria-label="Delete meeting"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] mt-2 truncate">
            <span className="font-semibold text-slate-800">{meeting.lead}</span>
            <span className="text-slate-400"> · {meeting.company}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-rose-50">
        <BtnPrimary className="!py-1.5 !px-3 !text-[11px] !rounded-xl" onClick={() => onJoin(meeting)}>
          <Video className="w-3.5 h-3.5" /> Join
        </BtnPrimary>
        {meeting.meetLink && (
          <BtnSecondary className="!py-1.5 !px-3 !text-[11px] !rounded-xl" onClick={() => onCopyLink(meeting.meetLink)}>
            <Copy className="w-3.5 h-3.5" /> Copy
          </BtnSecondary>
        )}
      </div>
    </article>
  );
}

export default function EmployeeMeetings() {
  const {
    employee,
    leads,
    meetingsUpcoming,
    meetingsHistory,
    createMeeting,
    cancelMeeting,
    refreshLeads,
    refreshMeetings,
    usingApi,
  } = useEmployee();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [drawerOpen, setDrawerOpen] = useState(searchParams.get("action") === "add");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "add") setDrawerOpen(true);
  }, [searchParams]);

  useEffect(() => {
    refreshLeads();
    refreshMeetings();
  }, [refreshLeads, refreshMeetings]);

  const selectedPlatform = MEETING_PLATFORMS.find((p) => p.id === form.platform) || MEETING_PLATFORMS[0];

  const stats = useMemo(() => ({
    today: meetingsUpcoming.filter((m) => m.time.toLowerCase().includes("today")).length,
    week: meetingsUpcoming.length,
    completed: meetingsHistory.length,
    googleMeet: meetingsUpcoming.filter((m) => m.platform === "Google Meet").length,
  }), [meetingsUpcoming, meetingsHistory]);

  const filteredUpcoming = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meetingsUpcoming;
    return meetingsUpcoming.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.lead.toLowerCase().includes(q) ||
        m.platform.toLowerCase().includes(q),
    );
  }, [meetingsUpcoming, search]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meetingsHistory;
    return meetingsHistory.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.outcome || "").toLowerCase().includes(q),
    );
  }, [meetingsHistory, search]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    if (searchParams.get("action") === "add") setSearchParams({}, { replace: true });
  };

  const handleGenerateMeetLink = () => {
    const link = generateGoogleMeetLink();
    setForm((f) => ({ ...f, meetLink: link, platform: "google_meet" }));
    toast.success("Google Meet link generated");
  };

  const handleCopyLink = (link) => {
    navigator.clipboard?.writeText(link);
    toast.success("Meeting link copied");
  };

  const handleJoin = (meeting) => {
    if (meeting.meetLink) {
      window.open(meeting.meetLink, "_blank", "noopener,noreferrer");
      toast.success(`Opening ${meeting.platform}…`);
    } else {
      toast.success("Joining meeting…");
    }
  };

  const handleDelete = async (meetingId) => {
    await cancelMeeting(meetingId);
    toast.success("Meeting deleted");
  };

  const handleCreate = async () => {
    if (submitting) return;
    if (!form.title.trim()) {
      toast.error("Meeting title is required");
      return;
    }
    if (!form.leadId) {
      toast.error("Select a lead for this meeting");
      return;
    }
    setSubmitting(true);
    try {
      const saved = await createMeeting(form);
      if (saved === null && usingApi) return;
      setForm({ ...EMPTY_FORM, date: getEmpAppToday() });
      closeDrawer();
      toast.success("Meeting saved");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5 page-shell min-w-0 animate-fade-in">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard compact label="Today" value={String(stats.today)} icon={Calendar} tone="primary" change="scheduled" sub="" />
        <StatCard compact label="This Week" value={String(stats.week)} icon={CalendarClock} tone="warning" change="upcoming" sub="" />
        <StatCard compact label="Completed" value={String(stats.completed)} icon={CheckCircle2} tone="success" change="last 30 days" sub="" />
        <StatCard compact label="Google Meet" value={String(stats.googleMeet)} icon={Link2} tone="success" change="with live links" sub="" />
      </div>

      <GlassCard className="p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center">
          <div className={`${SEGMENT_WRAP} w-full sm:w-auto`}>
            {[
              { id: "upcoming", label: "Upcoming", icon: CalendarClock },
              { id: "history", label: "History", icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1 ${SEGMENT_BTN} ${
                  tab === id ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings, leads, platforms…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-rose-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition"
            />
          </div>
          <BtnPrimary onClick={() => setDrawerOpen(true)} className="w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4" /> Book Meeting
          </BtnPrimary>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 sm:gap-4 items-stretch">
        <div className="min-w-0 flex flex-col">
          {tab === "upcoming" ? (
            filteredUpcoming.length === 0 ? (
              <GlassCard className={`py-10 flex items-center justify-center ${PANEL_HEIGHT}`}>
                <EmpEmptyState icon="📅" title="No upcoming meetings" subtitle="Book a meeting or clear your search" />
              </GlassCard>
            ) : (
              <GlassCard className={`p-0 overflow-hidden flex flex-col ${PANEL_HEIGHT}`}>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin p-3 sm:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredUpcoming.map((m) => (
                      <UpcomingCard
                        key={m.id}
                        meeting={m}
                        onJoin={handleJoin}
                        onCopyLink={handleCopyLink}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              </GlassCard>
            )
          ) : (
            <GlassCard className={`p-0 overflow-hidden flex flex-col ${PANEL_HEIGHT}`}>
              <div className="px-4 py-3 border-b border-rose-50 bg-rose-50/40 shrink-0">
                <p className="text-sm font-black text-slate-900">Meeting History</p>
                <p className="text-[11px] text-slate-500">Past sessions & outcomes</p>
              </div>
              {filteredHistory.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmpEmptyState icon="📋" title="No history found" subtitle="Try a different search" />
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin divide-y divide-rose-50">
                  {filteredHistory.map((m) => (
                    <div key={m.id} className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-rose-50/30 transition">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{m.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.time}</p>
                        {m.platform && (
                          <span className="inline-block mt-1.5">
                            <PlatformBadge platform={m.platform} />
                          </span>
                        )}
                      </div>
                      <Badge tone="success">{m.outcome}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}
        </div>

        <div className="hidden xl:flex min-w-0 flex-col">
          <TodaySchedulePanel
            upcoming={filteredUpcoming}
            history={filteredHistory}
            onJoin={handleJoin}
            onCopyLink={handleCopyLink}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <BookMeetingDrawer
        open={drawerOpen}
        form={form}
        setForm={setForm}
        leads={leads}
        employee={employee}
        selectedPlatform={selectedPlatform}
        onClose={closeDrawer}
        onCreate={handleCreate}
        onGenerateLink={handleGenerateMeetLink}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
}
