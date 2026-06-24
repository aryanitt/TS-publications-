import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  Clock,
  Building2,
  BadgeCheck,
  Users,
  Activity,
  Globe,
  Laptop,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Badge } from "../components/Primitives.jsx";
import AdminProfileHeader, { DashboardScrollbarStyles } from "../components/AdminProfileHeader.jsx";
import {
  SettingsSidebar,
  SettingsMobileTabs,
  SettingsPanel,
  PanelSection,
  PanelFooter,
  inputClass,
  labelClass,
} from "../components/SettingsLayout.jsx";
import { useAdmin } from "../context/AdminContext.jsx";

const tabs = [
  { id: "profile", label: "Profile", icon: BadgeCheck },
  { id: "security", label: "Sign-in & Security", icon: Shield },
  { id: "access", label: "Access & Permissions", icon: Users },
  { id: "activity", label: "Recent Activity", icon: Activity },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function Admin() {
  const { admin, updateAdmin, connectGoogle, disconnectGoogle } = useAdmin();
  const [activeTab, setActiveTab] = useState("profile");
  const [profileDirty, setProfileDirty] = useState(false);
  const [draft, setDraft] = useState({
    fullName: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    city: admin.city,
    department: admin.department,
    timezone: admin.timezone,
  });

  const updateDraft = (key, value) => {
    setDraft((p) => ({ ...p, [key]: value }));
    setProfileDirty(true);
  };

  const resetDraft = () => {
    setDraft({
      fullName: admin.fullName,
      email: admin.email,
      phone: admin.phone,
      city: admin.city,
      department: admin.department,
      timezone: admin.timezone,
    });
    setProfileDirty(false);
  };

  const handleSaveProfile = () => {
    updateAdmin({
      ...draft,
      initials: draft.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
    setProfileDirty(false);
    toast.success("Admin profile updated");
  };

  const handleGoogleConnect = () => {
    connectGoogle();
    toast.success("Google account connected (demo — wire OAuth next)");
  };

  const handleGoogleDisconnect = () => {
    disconnectGoogle();
    toast("Google account disconnected", { icon: "ℹ️" });
  };

  const auditEntries = [
    { id: 1, action: "Published incentive rule config v2.3", time: "Today, 10:14 AM" },
    { id: 2, action: "Added team member — Siddharth Mehta", time: "Yesterday, 4:32 PM" },
    { id: 3, action: "Updated KPI weightages for Sales team", time: "Jun 17, 2026" },
    { id: 4, action: "Exported monthly performance report", time: "Jun 15, 2026" },
  ];

  const profileFields = [
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Work Email" },
    { key: "phone", label: "Phone Number" },
    { key: "city", label: "City" },
    { key: "department", label: "Department" },
    { key: "timezone", label: "Timezone" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 page-shell min-w-0">
      <Toaster position="top-right" />
      <DashboardScrollbarStyles />
      <AdminProfileHeader />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 sm:gap-6 min-w-0">
        <SettingsMobileTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <SettingsSidebar
          title="Admin Control"
          subtitle="Manage account, access & security"
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <SettingsPanel
          footer={
            activeTab === "profile" ? (
              <PanelFooter
                left={
                  <Badge tone={profileDirty ? "warning" : "muted"}>
                    {profileDirty ? "Unsaved profile changes" : "Profile synchronized"}
                  </Badge>
                }
                actions={
                  <>
                    <button
                      type="button"
                      onClick={resetDraft}
                      className="flex-1 sm:flex-initial px-4 py-2 border border-rose-200 hover:border-rose-400 text-[#be123c] rounded-xl text-xs font-bold transition-all shadow-sm bg-white"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-[#be123c] hover:bg-[#a20f32] text-white rounded-xl text-xs font-bold transition-all shadow-md active:translate-y-px"
                    >
                      Save Profile
                    </button>
                  </>
                }
              />
            ) : null
          }
        >
          {activeTab === "profile" && (
            <PanelSection
              title="Admin Profile"
              subtitle="Your identity across the TS Publication workspace"
            >
              <div className="p-4 border border-rose-100/50 rounded-2xl bg-white space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-[#be123c] uppercase">Personal details</span>
                  <Badge tone="primary">{admin.role}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileFields.map(({ key, label }) => (
                    <div key={key}>
                      <label className={labelClass}>{label}</label>
                      <input
                        value={draft[key]}
                        onChange={(e) => updateDraft(key, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </PanelSection>
          )}

          {activeTab === "security" && (
            <PanelSection
              title="Sign-in & Security"
              subtitle="Authentication is handled via Google OAuth — no passwords stored in this app"
            >
              <div className="p-4 border border-rose-100/50 rounded-2xl bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 grid place-items-center shrink-0 shadow-sm">
                    <GoogleIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 uppercase">Google Account</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {admin.googleConnected
                        ? `Signed in as ${admin.googleEmail}`
                        : "Connect your Google account to sign in securely"}
                    </p>
                  </div>
                  {admin.googleConnected ? (
                    <button
                      type="button"
                      onClick={handleGoogleDisconnect}
                      className="px-4 py-2 border border-rose-200 text-[#be123c] rounded-xl text-xs font-bold bg-white hover:bg-rose-50 shrink-0"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleConnect}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 shrink-0"
                    >
                      <GoogleIcon />
                      Connect with Google
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 border border-amber-100 rounded-2xl bg-amber-50/60">
                <p className="text-xs font-black text-amber-800 uppercase">Password login removed</p>
                <p className="text-[11px] text-amber-700/90 mt-1 leading-relaxed">
                  This workspace no longer uses email/password credentials. All admin access will flow through Google OAuth once you wire the backend callback.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Active sessions</p>
                {admin.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-100/50 bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                        {session.device.includes("iPhone") ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{session.device}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {session.location} · {session.lastActive}
                        </p>
                      </div>
                    </div>
                    {session.current && <Badge tone="success">Current</Badge>}
                  </div>
                ))}
              </div>
            </PanelSection>
          )}

          {activeTab === "access" && (
            <PanelSection
              title="Access & Permissions"
              subtitle="What this admin account can do in the CRM"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-rose-100/50 rounded-2xl bg-slate-50/50">
                  <p className={labelClass}>Role</p>
                  <p className="text-lg font-black text-slate-900">{admin.role}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Highest workspace privilege tier</p>
                </div>
                <div className="p-4 border border-rose-100/50 rounded-2xl bg-white">
                  <p className={labelClass}>Workspace</p>
                  <p className="text-lg font-black text-slate-900">TS Publication</p>
                  <p className="text-[11px] text-slate-500 mt-1">Enterprise CRM dashboard</p>
                </div>
              </div>
              <div>
                <p className={labelClass}>Granted permissions</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {admin.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold
                                 bg-rose-50 text-rose-800 border border-rose-100"
                    >
                      <BadgeCheck className="w-3 h-3 text-rose-600" />
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </PanelSection>
          )}

          {activeTab === "activity" && (
            <PanelSection
              title="Recent Admin Activity"
              subtitle="Latest changes made under this account"
            >
              <div className="space-y-2">
                {auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-xl border border-rose-100/50 bg-white hover:bg-rose-50/30 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">{entry.action}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{entry.time}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#be123c] hover:text-[#a20f32] mt-2"
              >
                View full audit trail in Settings
                <ExternalLink className="w-3 h-3" />
              </Link>
            </PanelSection>
          )}
        </SettingsPanel>
      </div>
    </div>
  );
}
