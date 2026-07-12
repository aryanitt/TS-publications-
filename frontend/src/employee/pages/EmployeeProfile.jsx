import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Briefcase,
  LogOut,
  Lock,
  Phone,
  Settings,
  Target,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { Badge, StatCard } from "../../components/Primitives.jsx";
import {
  SettingsSidebar,
  SettingsMobileTabs,
  SettingsPanel,
  PanelSection,
  PanelFooter,
  inputClass,
  labelClass,
} from "../../components/SettingsLayout.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import { filterCallsForPeriod } from "../../data/employeeMock.js";
import EmployeeProfileHeader, { DashboardScrollbarStyles } from "../components/EmployeeProfileHeader.jsx";

const tabs = [
  { id: "profile", label: "Profile", icon: BadgeCheck },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "preferences", label: "Preferences", icon: Settings },
];

function formatJoinDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function EmployeeProfile() {
  const { employee, leads, calls, followUps, loading } = useEmployee();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [displayName, setDisplayName] = useState(employee?.name || "");
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
    const pickup = employee?.pickupRate ?? 0;
    const qualification = employee?.qualificationRate ?? 0;

    return { openFollowUps, callsToday, converted, convRate, pickup, qualification };
  }, [calls, followUps, leads, employee]);

  const perfRows = useMemo(() => [
    { label: "Pickup rate", value: `${stats.pickup}%` },
    { label: "Qualification", value: `${stats.qualification}%` },
    { label: "Conversion", value: `${stats.convRate}%` },
    { label: "Calls target", value: `${stats.callsToday}/${employee?.callsTarget || 60}` },
  ], [stats, employee?.callsTarget]);

  const handleSave = () => {
    setPrefsDirty(false);
    toast.success("Profile preferences saved");
  };

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
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

  const profileFields = [
    { key: "email", label: "Work Email", value: employee?.email, readOnly: true },
    { key: "phone", label: "Phone Number", value: employee?.phone || "Not set", readOnly: true },
    { key: "joiningDate", label: "Joining Date", value: formatJoinDate(employee?.joiningDate), readOnly: true },
    { key: "department", label: "Department", value: employee?.department, readOnly: true },
    { key: "territory", label: "Territory", value: employee?.city || employee?.territory || "—", readOnly: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 page-shell min-w-0">
      <DashboardScrollbarStyles />
      <EmployeeProfileHeader />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active Leads"
          value={String(leads.length)}
          change={`${leads.length ? "In pipeline" : "No leads yet"}`}
          sub=""
          icon={Users}
          tone="info"
          compact
        />
        <StatCard
          label="Calls Today"
          value={String(stats.callsToday)}
          change={`Target ${employee?.callsTarget || 60}`}
          sub=""
          icon={Phone}
          tone="purple"
          compact
        />
        <StatCard
          label="Follow-ups"
          value={String(stats.openFollowUps)}
          change={stats.openFollowUps ? "Open items" : "All clear"}
          sub=""
          icon={Target}
          tone="warning"
          compact
        />
        <StatCard
          label="Converted"
          value={String(stats.converted)}
          change={`${stats.convRate}% win rate`}
          sub=""
          icon={TrendingUp}
          tone="success"
          compact
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 sm:gap-6 min-w-0">
        <SettingsMobileTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <SettingsSidebar
          title="Employee Account"
          subtitle="Profile, performance & workspace"
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <SettingsPanel
          footer={
            activeTab === "preferences" ? (
              <PanelFooter
                left={
                  <Badge tone={prefsDirty ? "warning" : "muted"}>
                    {prefsDirty ? "Unsaved preference changes" : "Preferences synchronized"}
                  </Badge>
                }
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDisplayName(employee?.name || "");
                        setReminderHrs(24);
                        setMeetingPlatform("google_meet");
                        setPrefsDirty(false);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 border border-rose-200 hover:border-rose-400 text-[#be123c] rounded-xl text-xs font-bold transition-all shadow-sm bg-white"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-[#be123c] hover:bg-[#a20f32] text-white rounded-xl text-xs font-bold transition-all shadow-md active:translate-y-px"
                    >
                      Save Preferences
                    </button>
                  </>
                }
              />
            ) : null
          }
        >
          {activeTab === "profile" && (
            <PanelSection
              title="Contact & Profile"
              subtitle="Details synced from your team account"
            >
              <div className="p-4 border border-rose-100/50 rounded-2xl bg-white space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-[#be123c] uppercase">Personal details</span>
                  <Badge tone="primary">{employee?.role || "Sales"}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Employee ID</label>
                    <input
                      value={employee?.id ? `#${employee.id}` : "—"}
                      readOnly
                      className={`${inputClass} bg-slate-50 text-slate-600 cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Display Name</label>
                    <input
                      value={employee?.name || "—"}
                      readOnly
                      className={`${inputClass} bg-slate-50 text-slate-600 cursor-not-allowed`}
                    />
                  </div>
                  {profileFields.map(({ key, label, value }) => (
                    <div key={key}>
                      <label className={labelClass}>{label}</label>
                      <input
                        value={value || "—"}
                        readOnly
                        className={`${inputClass} bg-slate-50 text-slate-600 cursor-not-allowed`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase">Account session</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Signed in as {employee?.email || employee?.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-rose-200 text-[#be123c] rounded-xl text-xs font-bold bg-white hover:bg-rose-50 shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </PanelSection>
          )}

          {activeTab === "performance" && (
            <PanelSection
              title="Performance Snapshot"
              subtitle="How you're tracking this period"
            >
              <div className="p-4 border border-rose-100/50 rounded-2xl bg-white">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                  <Briefcase className="w-4 h-4 text-[#be123c]" />
                  <span className="text-xs font-black text-[#be123c] uppercase">Key metrics</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {perfRows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl border border-rose-100 bg-gradient-to-br from-white via-[#fffbfb] to-[#fff0f2] p-3 text-center"
                    >
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{row.label}</p>
                      <p className="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </PanelSection>
          )}

          {activeTab === "preferences" && (
            <PanelSection
              title="Workspace Preferences"
              subtitle="Customize how your employee panel behaves"
            >
              <div className="p-4 border border-rose-100/50 rounded-2xl bg-white space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-[#be123c] uppercase">Display & notifications</span>
                  <Badge tone="muted">Local only</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Display name</label>
                    <input
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setPrefsDirty(true);
                      }}
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Reminder lead time (hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={reminderHrs}
                      onChange={(e) => {
                        setReminderHrs(Number(e.target.value) || 24);
                        setPrefsDirty(true);
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Default meeting platform</label>
                    <select
                      value={meetingPlatform}
                      onChange={(e) => {
                        setMeetingPlatform(e.target.value);
                        setPrefsDirty(true);
                      }}
                      className={inputClass}
                    >
                      <option value="google_meet">Google Meet</option>
                      <option value="zoom">Zoom</option>
                      <option value="teams">Microsoft Teams</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Used when booking meetings from Follow-ups or Leads
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase">Security</p>
                    <p className="text-[11px] text-slate-500 mt-1">Update your sign-in password</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/change-password")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-rose-200 text-[#be123c] rounded-xl text-xs font-bold bg-white hover:bg-rose-50 shrink-0"
                  >
                    <Lock className="w-4 h-4" />
                    Change password
                  </button>
                </div>
              </div>
            </PanelSection>
          )}
        </SettingsPanel>
      </div>
    </div>
  );
}
