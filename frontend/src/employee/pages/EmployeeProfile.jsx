import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  Calendar,
  LogOut,
  Lock,
  Mail,
  MapPin,
  Phone,
  Target,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import useIsMobile from "../../lib/useIsMobile.js";
import { Badge } from "../../components/Primitives.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import { filterCallsForPeriod } from "../../data/employeeMock.js";
import {
  BtnPrimary,
  FormGroup,
  FormInput,
  FormLabel,
  FormSelect,
  EmployeeDoodleAvatar,
} from "../components/EmpUI.jsx";

const PANEL = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

function formatJoinDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <article className={`${PANEL} p-3 sm:p-4 flex flex-col gap-1 min-h-[76px] sm:min-h-[84px]`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 grid place-items-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-rose-600" />
        </div>
      </div>
      <p className="text-lg sm:text-xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">{sub}</p>}
    </article>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center shrink-0">
        <Icon className="w-4 h-4 text-slate-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-900 mt-0.5 break-all">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function EmployeeProfile() {
  const { employee, leads, calls, followUps, loading } = useEmployee();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [displayName, setDisplayName] = useState(employee.name);
  const [reminderHrs, setReminderHrs] = useState(24);
  const [meetingPlatform, setMeetingPlatform] = useState("google_meet");

  useEffect(() => {
    if (employee?.name) setDisplayName(employee.name);
  }, [employee?.name]);

  const stats = useMemo(() => {
    const openFollowUps = followUps.filter((f) => !f.done).length;
    const callsToday = filterCallsForPeriod(calls, "today").length;
    const converted = leads.filter((l) => l.status === "converted").length;
    const convRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;
    const pickup = employee.pickupRate ?? 0;
    const qualification = employee.qualificationRate ?? 0;

    return { openFollowUps, callsToday, converted, convRate, pickup, qualification };
  }, [calls, followUps, leads, employee]);

  const perfRows = useMemo(() => [
    { label: "Pickup rate", value: `${stats.pickup}%` },
    { label: "Qualification", value: `${stats.qualification}%` },
    { label: "Conversion", value: `${stats.convRate}%` },
    { label: "Calls target", value: `${stats.callsToday}/${employee.callsTarget || 60}` },
  ], [stats, employee.callsTarget]);

  const handleSave = () => {
    toast.success("Profile preferences saved");
  };

  if (loading && !employee?.name) {
    return (
      <div className="page-shell min-w-0 animate-pulse space-y-4">
        <div className="h-36 rounded-2xl bg-rose-50" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-50" />)}
        </div>
      </div>
    );
  }

  const firstName = employee.name?.split(/\s+/)[0] || "there";

  return (
    <div className="space-y-4 sm:space-y-5 page-shell min-w-0 animate-fade-in">
      {/* Hero */}
      <section className="rounded-2xl sm:rounded-[20px] overflow-hidden border border-rose-200/60 bg-gradient-to-br from-rose-700 via-rose-600 to-rose-500 text-white shadow-[0_8px_32px_rgba(190,18,60,0.25)] relative">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
        <div className="relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="shrink-0 ring-4 ring-white/20 rounded-full">
            <EmployeeDoodleAvatar size={isMobile ? 64 : 80} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge tone="muted" className="!bg-white/15 !text-white !border-white/25 !text-[10px]">
                {employee.department || "Sales"}
              </Badge>
              {employee.id && (
                <span className="text-[10px] font-semibold text-white/70">ID #{employee.id}</span>
              )}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight truncate">{employee.name}</h1>
            <p className="text-sm text-white/85 mt-0.5">{employee.role || "Sales Executive"}</p>
            <p className="text-xs text-white/70 mt-2 max-w-md">
              Manage your workspace preferences and track how you&apos;re performing this period.
            </p>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatTile icon={Users} label="Active Leads" value={String(leads.length)} sub="In your pipeline" />
        <StatTile icon={Phone} label="Calls Today" value={String(stats.callsToday)} sub={`Target ${employee.callsTarget || 60}`} />
        <StatTile icon={Target} label="Follow-ups" value={String(stats.openFollowUps)} sub="Open items" />
        <StatTile icon={TrendingUp} label="Converted" value={String(stats.converted)} sub={`${stats.convRate}% win rate`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Contact & work info */}
        <div className="lg:col-span-2 space-y-4">
          <article className={`${PANEL} p-4 sm:p-5`}>
            <h2 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-1">Contact & profile</h2>
            <p className="text-[11px] text-slate-500 mb-3">Details synced from your team account</p>
            <InfoRow icon={Mail} label="Email" value={employee.email} />
            <InfoRow icon={Phone} label="Phone" value={employee.phone || "Not set"} />
            <InfoRow icon={Calendar} label="Joining date" value={formatJoinDate(employee.joiningDate)} />
            <InfoRow icon={Briefcase} label="Department" value={employee.department} />
            <InfoRow icon={MapPin} label="Territory" value={employee.city || employee.territory || "—"} />
          </article>

          <article className={`${PANEL} p-4 sm:p-5`}>
            <h2 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-3">Performance snapshot</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {perfRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center"
                >
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{row.label}</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">{row.value}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Preferences */}
        <article className={`${PANEL} p-4 sm:p-5 lg:col-span-3`}>
          <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
            <div>
              <h2 className="font-display font-bold text-slate-900 text-sm sm:text-base">Workspace preferences</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                Customize how {firstName}&apos;s employee panel behaves
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 grid place-items-center shrink-0">
              <Bell className="w-4 h-4 text-rose-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <FormGroup>
              <FormLabel>Display name</FormLabel>
              <FormInput
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Reminder lead time (hours)</FormLabel>
              <FormInput
                type="number"
                min={1}
                max={72}
                value={reminderHrs}
                onChange={(e) => setReminderHrs(Number(e.target.value) || 24)}
              />
            </FormGroup>
            <FormGroup className="sm:col-span-2">
              <FormLabel>Default meeting platform</FormLabel>
              <FormSelect
                value={meetingPlatform}
                onChange={(e) => setMeetingPlatform(e.target.value)}
              >
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
              </FormSelect>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Video className="w-3 h-3" />
                Used when booking meetings from Follow-ups or Leads
              </p>
            </FormGroup>
          </div>

          <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <BtnPrimary className="w-full sm:flex-1 justify-center" onClick={handleSave}>
              Save preferences
            </BtnPrimary>
            <button
              type="button"
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              onClick={() => navigate("/change-password")}
            >
              <Lock className="w-4 h-4" />
              Change password
            </button>
            <button
              type="button"
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50"
              onClick={() => { logout(); navigate("/login", { replace: true }); }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
