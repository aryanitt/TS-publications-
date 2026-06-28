import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertCircle, CalendarClock, CheckCircle2, Clock, List, Mail, MessageCircle, Phone, Plus, Search, Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard, StatCard, Badge } from "../../components/Primitives.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import { EMP_APP_TODAY } from "../../data/employeeMock.js";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../../lib/segmentPills.js";
import {
  EmpEmptyState, EmpModal, BtnPrimary, BtnSecondary, BtnGhost,
  FormLabel, FormInput, FormSelect, FormGroup, FormRow, AvatarCircle,
} from "../components/EmpUI.jsx";

const URGENCY = {
  overdue: {
    label: "Overdue",
    section: "Overdue",
    tone: "danger",
    time: "text-red-600",
    icon: AlertCircle,
  },
  today: {
    label: "Due Today",
    section: "Due Today",
    tone: "warning",
    time: "text-amber-700",
    icon: Clock,
  },
  upcoming: {
    label: "Upcoming",
    section: "Upcoming",
    tone: "success",
    time: "text-emerald-700",
    icon: CalendarClock,
  },
};

const FILTERS = [
  { id: "all", label: "All", short: "All", icon: List },
  { id: "overdue", label: "Overdue", short: "Late", icon: AlertCircle },
  { id: "today", label: "Due Today", short: "Today", icon: Clock },
  { id: "upcoming", label: "Upcoming", short: "Soon", icon: CalendarClock },
];

const TYPE_ICON = {
  Call: Phone,
  WhatsApp: MessageCircle,
  Email: Mail,
  Meeting: Video,
};

const CARD_BTN =
  "inline-flex items-center justify-center gap-1 w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-semibold border transition min-h-[36px] sm:min-h-0";

function FollowUpCard({ item, onCall, onDone }) {
  const u = URGENCY[item.urgency] || URGENCY.upcoming;
  const TypeIcon = TYPE_ICON[item.type] || Phone;
  const statusLabel = item.urgency === "overdue" ? "Overdue" : item.urgency === "today" ? "Today" : "Upcoming";
  const statusPill = {
    overdue: "bg-red-50 text-red-700 border-red-200",
    today: "bg-amber-50 text-amber-800 border-amber-200",
    upcoming: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[item.urgency] || "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <article className="group flex flex-col rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-4 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-200 min-w-0">
      <div className="flex items-center gap-2 mb-1 sm:mb-2">
        <AvatarCircle initials={item.av} color={item.color} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.name}</p>
            <span className={`sm:hidden shrink-0 text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusPill}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">{item.company}</p>
        </div>
        <span className="hidden sm:inline-flex shrink-0">
          <Badge tone={u.tone}>{statusLabel}</Badge>
        </span>
      </div>

      <p className="text-[10px] sm:text-xs text-slate-600 leading-snug line-clamp-1 sm:line-clamp-2">
        {item.note}
      </p>

      <div className="flex items-center justify-between gap-2 mt-1.5 sm:mt-3">
        <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-semibold text-slate-600 bg-slate-50 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
          <TypeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          {item.type}
        </span>
        <span className={`text-[9px] sm:text-[10px] font-semibold tabular-nums truncate ${u.time}`}>
          {item.time}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onCall(item)}
          className={`${CARD_BTN} bg-rose-700 text-white border-rose-700 hover:bg-rose-800`}
        >
          <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Call
        </button>
        <button
          type="button"
          onClick={() => onDone(item)}
          className={`${CARD_BTN} bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800`}
        >
          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Done
        </button>
      </div>
    </article>
  );
}

function FollowUpGrid({ items, onCall, onDone }) {
  return (
    <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:gap-3">
      {items.map((item) => (
        <FollowUpCard key={item.id} item={item} onCall={onCall} onDone={onDone} />
      ))}
    </div>
  );
}

const EMPTY_SCHEDULE = {
  leadName: "",
  date: EMP_APP_TODAY,
  time: "14:00",
  type: "Call",
  note: "",
};

export default function EmployeeFollowUps() {
  const { leads, followUps, scheduleFollowUp, completeFollowUp, refreshFollowUps, loading } = useEmployee();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(searchParams.get("action") === "add");
  const [form, setForm] = useState(EMPTY_SCHEDULE);

  useEffect(() => {
    if (searchParams.get("action") === "add") setModalOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    refreshFollowUps(undefined, leads);
  }, [loading, refreshFollowUps, leads]);

  const openFollowUps = useMemo(() => followUps.filter((f) => !f.done), [followUps]);

  const filterCounts = useMemo(() => ({
    all: openFollowUps.length,
    overdue: openFollowUps.filter((f) => f.urgency === "overdue").length,
    today: openFollowUps.filter((f) => f.urgency === "today").length,
    upcoming: openFollowUps.filter((f) => f.urgency === "upcoming").length,
  }), [openFollowUps]);

  const stats = useMemo(() => ({
    overdue: filterCounts.overdue,
    today: filterCounts.today,
    upcoming: filterCounts.upcoming,
    total: filterCounts.all,
  }), [filterCounts]);

  const filtered = useMemo(() => {
    let list = openFollowUps;
    if (filter !== "all") list = list.filter((f) => f.urgency === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.company.toLowerCase().includes(q) ||
          f.note.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, search, openFollowUps]);

  const grouped = useMemo(() => {
    if (filter !== "all") return null;
    return ["overdue", "today", "upcoming"]
      .map((key) => ({
        key,
        meta: URGENCY[key],
        items: filtered.filter((f) => f.urgency === key),
      }))
      .filter((g) => g.items.length > 0);
  }, [filter, filtered]);

  const closeModal = () => {
    setModalOpen(false);
    if (searchParams.get("action") === "add") {
      setSearchParams({}, { replace: true });
    }
  };

  const handleCall = (item) => {
    navigate(`/employee/call-assistant?lead=${encodeURIComponent(item.name)}`);
  };
  const handleDone = (item) => {
    completeFollowUp(item.id);
    toast.success(`${item.name} marked done — task updated`);
  };

  const handleSchedule = () => {
    if (!form.leadName) {
      toast.error("Select a lead");
      return;
    }
    if (!form.date || !form.time) {
      toast.error("Pick date and time");
      return;
    }
    const lead = leads.find((l) => l.name === form.leadName);
    scheduleFollowUp({
      leadName: form.leadName,
      company: lead?.company,
      type: form.type,
      date: form.date,
      time: form.time,
      note: form.note,
      leadId: lead?.id,
    });
    closeModal();
    setForm(EMPTY_SCHEDULE);
    toast.success("Follow-up scheduled — added to My Tasks");
  };

  return (
    <div className="space-y-3 sm:space-y-5 page-shell min-w-0 animate-fade-in">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          compact
          label="Overdue"
          value={String(stats.overdue)}
          icon={AlertCircle}
          tone="danger"
          change="needs action"
          changeTone="danger"
          sub=""
        />
        <StatCard
          compact
          label="Due Today"
          value={String(stats.today)}
          icon={Clock}
          tone="warning"
          change="scheduled today"
          sub=""
        />
        <StatCard
          compact
          label="Upcoming"
          value={String(stats.upcoming)}
          icon={CalendarClock}
          tone="success"
          change="this week"
          sub=""
        />
        <StatCard
          compact
          label="Total Open"
          value={String(stats.total)}
          icon={List}
          tone="primary"
          change={`${followUps.filter((f) => f.done).length} completed`}
          changeTone="success"
          sub=""
        />
      </div>

      <GlassCard className="p-2.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* Mobile: 4 equal filter pills in one row */}
          <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded-lg bg-slate-100/80 border border-slate-200/80 sm:hidden">
            {FILTERS.map(({ id, short, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold transition ${SEGMENT_BTN} ${
                  filter === id ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                }`}
              >
                <Icon className="w-3 h-3" />
                {short}
              </button>
            ))}
          </div>

          <div className={`${SEGMENT_WRAP} hidden sm:inline-flex max-w-full`}>
            {FILTERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1 ${SEGMENT_BTN} ${
                  filter === id ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
                <span className={`min-w-[18px] h-[18px] rounded-full grid place-items-center text-[9px] font-black ${
                  filter === id ? "bg-rose-700 text-white" : "bg-slate-200/80 text-slate-500"
                }`}>
                  {filterCounts[id]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts, notes…"
                className="w-full h-9 sm:h-10 pl-8 sm:pl-9 pr-3 rounded-xl bg-white border border-rose-100 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition"
              />
            </div>
            <BtnPrimary onClick={() => setModalOpen(true)} className="w-full sm:w-auto shrink-0 !min-h-[36px] sm:!min-h-0 !py-2 !text-xs sm:!text-sm">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Schedule
            </BtnPrimary>
          </div>

          <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400">
            {filterCounts.overdue} overdue · {filterCounts.today} today · {filtered.length} shown
            <span className="hidden sm:inline"> · {filterCounts.upcoming} upcoming</span>
          </p>
        </div>
      </GlassCard>

      {filtered.length === 0 ? (
        <GlassCard className="py-4">
          <EmpEmptyState
            icon="📅"
            title={search ? "No follow-ups match your search" : "All caught up"}
            subtitle={search ? "Try a different keyword" : "Nothing pending in this category"}
          />
          {!search && filter !== "all" && (
            <div className="flex justify-center pb-6">
              <BtnPrimary onClick={() => setFilter("all")}>View all follow-ups</BtnPrimary>
            </div>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-2 sm:space-y-5">
          {grouped ? (
            grouped.map(({ key, meta, items }) => {
              const SectionIcon = meta.icon;
              return (
                <GlassCard key={key} className="p-2.5 sm:p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl grid place-items-center shrink-0 ${
                      key === "overdue" ? "bg-red-100 text-red-700 border border-red-200" :
                      key === "today" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                      "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}>
                      <SectionIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="text-xs sm:text-sm font-display font-bold text-slate-900">{meta.section}</h3>
                        <span className="inline-flex items-center justify-center min-w-[1.125rem] h-4 px-1 rounded-full bg-slate-100 border border-slate-200 text-[9px] sm:text-[10px] font-bold text-slate-600 tabular-nums">
                          {items.length}
                        </span>
                      </div>
                      <p className="hidden sm:block text-[11px] text-slate-500 font-medium">
                        {key === "overdue" ? "Past due — contact immediately" :
                         key === "today" ? "Scheduled for today" : "Later this week"}
                      </p>
                    </div>
                  </div>
                  <FollowUpGrid items={items} onCall={handleCall} onDone={handleDone} />
                </GlassCard>
              );
            })
          ) : (
            <GlassCard className="p-2.5 sm:p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-display font-bold text-slate-900">
                    {FILTERS.find((f) => f.id === filter)?.label}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">{filtered.length} follow-ups</p>
                </div>
              </div>
              <FollowUpGrid items={filtered} onCall={handleCall} onDone={handleDone} />
            </GlassCard>
          )}
        </div>
      )}

      <EmpModal
        open={modalOpen}
        onClose={closeModal}
        title="Schedule Follow-Up"
        subtitle="Set a reminder for a lead"
        footer={
          <>
            <BtnGhost onClick={closeModal}>Cancel</BtnGhost>
            <BtnPrimary onClick={handleSchedule}>Schedule</BtnPrimary>
          </>
        }
      >
        <FormGroup>
          <FormLabel>Lead</FormLabel>
          <FormSelect
            value={form.leadName}
            onChange={(e) => setForm((p) => ({ ...p, leadName: e.target.value }))}
          >
            <option value="">Select lead…</option>
            {leads.map((l) => (
              <option key={l.id} value={l.name}>{l.name} — {l.company}</option>
            ))}
          </FormSelect>
        </FormGroup>
        <FormRow>
          <FormGroup>
            <FormLabel>Date</FormLabel>
            <FormInput
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Time</FormLabel>
            <FormInput
              type="time"
              value={form.time}
              onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
            />
          </FormGroup>
        </FormRow>
        <FormGroup>
          <FormLabel>Type</FormLabel>
          <FormSelect
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          >
            <option>Call</option>
            <option>WhatsApp</option>
            <option>Email</option>
            <option>Meeting</option>
          </FormSelect>
        </FormGroup>
        <FormGroup>
          <FormLabel>Note</FormLabel>
          <FormInput
            placeholder="e.g. Proposal follow-up"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          />
        </FormGroup>
        <p className="text-[11px] text-slate-500 -mt-2">
          This will also appear in <strong className="text-slate-700">My Tasks</strong> on the selected date.
        </p>
      </EmpModal>
    </div>
  );
}
