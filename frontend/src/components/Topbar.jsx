import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Bell, History, Plus, ChevronDown,
  FileText, Users, Calculator,
  User, Briefcase, X, CheckCheck, Menu, Settings, LogOut,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiGet, apiPost } from "../lib/api.js";
import { queryKeys } from "../lib/queryKeys.js";
import DateRangeFilter from "./DateRangeFilter.jsx";
import AdminDoodleAvatar from "./AdminDoodleAvatar.jsx";

const titles = {
  "/":           { title: "Dashboard",             sub: "Overview of your CRM activity",            cta: "Quick Action" },
  "/sop":        { title: "SOP Management",        sub: "Standardize operations across teams",       cta: "Upload SOP"   },
  "/sales":      { title: "Sales Funnel",          sub: "Track every deal across your pipeline",     cta: "Add Deal"     },
  "/team":       { title: "Team Management",       sub: "Visibility into your people and performance", cta: "Add Member" },
  "/incentives": { title: "Incentive Calculations",sub: "Payouts, slabs and team performance",       cta: "Calculate"    },
  "/settings":   { title: "Settings",              sub: "Workspace preferences",                     cta: "Save"         },
  "/admin":      { title: "Admin Profile",         sub: "Your account, access & sign-in",            cta: "Save"         },
  "/leads":      { title: "Leads",                 sub: "Manage and track incoming leads",             cta: "Add Lead"     },
  "/pipeline":   { title: "Pipeline",              sub: "Real-time overview of your sales pipeline",   cta: "Add Lead"     },
  "/forms":      { title: "Forms Dashboard",       sub: "Lead capture forms across all channels",      cta: "Create Form"  },
  "/services":   { title: "Services Catalog",      sub: "Productized offerings & revenue lines",         cta: "Add Service"  },
  "/reports":    { title: "Reports",               sub: "Analytics and performance exports",           cta: "Export"       },
};

function resolvePageMeta(pathname) {
  if (/^\/services\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit Service", sub: "Update catalog details, pricing, and features" };
  }
  const serviceDetailMatch = pathname.match(/^\/services\/([^/]+)$/);
  if (serviceDetailMatch) {
    return {
      title: "Service Detail",
      sub: "Performance, tiers, and delivery",
    };
  }
  if (pathname.startsWith("/forms/")) {
    return { title: "Form Leads", sub: "Leads captured from this form", cta: "Export" };
  }
  const base = titles[pathname] ?? titles["/"];
  if (pathname === "/forms") {
    return { ...base, ctaTo: "/forms?action=createForm" };
  }
  if (pathname === "/services") {
    return { ...base, ctaTo: "/services?action=addService" };
  }
  if (pathname === "/pipeline") {
    return { ...base, ctaTo: "/pipeline?action=addLead" };
  }
  return base;
}

const HIDE_DATE_RANGE_ROUTES = ["/incentives", "/settings", "/admin"];

function hideDateRange(pathname) {
  return HIDE_DATE_RANGE_ROUTES.includes(pathname)
    || pathname.startsWith("/forms")
    || pathname.startsWith("/services")
    || pathname === "/pipeline";
}

const quickActions = [
  { label: "Add Lead",             icon: Plus,       to: "/sales",     search: "?action=addLead" },
  { label: "Add SOP",              icon: FileText,   to: "/sop",       search: "?action=addSOP"  },
  { label: "Add New Team Member",  icon: Users,      to: "/team",      search: "?action=addMember" },
  { label: "Create Form",          icon: FileText,   to: "/forms",     search: "?action=createForm" },
  { label: "Calculate Incentive",  icon: Calculator, to: "/incentives"                            },
];

// relative time helper
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON = {
  employee: { Icon: Users,     bg: "#fff0f6", color: "#e11d48" },
  lead:     { Icon: Briefcase, bg: "#eff6ff", color: "#2563eb" },
};

export default function Topbar({ onMenu }) {
  const { pathname } = useLocation();
  const showDateRange = !hideDateRange(pathname);
  const navigate     = useNavigate();
  const { admin }    = useAdmin();
  const { logout }   = useAuth();
  const meta         = resolvePageMeta(pathname);

  const [openMenu,       setOpenMenu]       = useState(null);
  const [searchQ,        setSearchQ]        = useState("");
  const [searchResults,  setSearchResults]  = useState([]);
  const [searching,      setSearching]      = useState(false);

  const searchRef  = useRef(null);
  const mobileSearchRef = useRef(null);
  const debounceRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: activityData } = useQuery({
    queryKey: queryKeys.activities,
    queryFn: () => apiGet("/api/activity"),
    staleTime: 2 * 60 * 1000,
  });

  const { data: notifData, refetch: refetchNotifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => apiGet("/api/activity/notifications"),
    staleTime: 2 * 60 * 1000,
  });

  const activities = activityData?.success ? activityData.activities : [];
  const notifications = notifData?.success ? notifData.notifications : [];
  const unreadCount = notifData?.success ? notifData.unreadCount : 0;

  // ── search with debounce ────────────────────────────────
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiGet(
          `/api/activity/search?q=${encodeURIComponent(searchQ)}`,
          { cacheTtl: 30 * 1000 },
        );
        if (data.success) setSearchResults(data.results);
      } catch (_) {}
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQ]);

  // ── mark all notifications read ─────────────────────────
  const markAllRead = async () => {
    try {
      await apiPost("/api/activity/notifications/read", {});
      queryClient.setQueryData(queryKeys.notifications, (old) =>
        old ? { ...old, unreadCount: 0, notifications: (old.notifications || []).map((x) => ({ ...x, is_read: true })) } : old,
      );
    } catch (_) {}
  };

  const refreshActivity = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.activities });
  };

  const refreshNotifications = () => {
    refetchNotifications();
  };

  const handleAction = (action) => {
    setOpenMenu(null);
    navigate(`${action.to}${action.search ?? ""}`);
  };

  const handleUserMenu = (item) => {
    setOpenMenu(null);
    if (item === "Admin Profile") navigate("/admin");
    else if (item === "Workspace Settings") navigate("/settings");
    else if (item === "Sign out") {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const userMenuItems = ["Admin Profile", "Workspace Settings", "Sign out"];

  // close search on outside click
  useEffect(() => {
    const handler = (e) => {
      const inDesktop = searchRef.current?.contains(e.target);
      const inMobile = mobileSearchRef.current?.contains(e.target);
      if (inDesktop || inMobile) return;
      setSearchQ("");
      setSearchResults([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-sm overflow-x-clip">
      <div className="flex items-center gap-2 px-3 sm:px-4 lg:px-8 py-2 min-h-[52px] md:min-h-20 min-w-0">

        <button
          onClick={onMenu}
          className="w-9 h-9 -ml-1 rounded-xl hover:bg-[#FFF5F8] text-[#DC143C] lg:hidden transition-all duration-200 shrink-0 grid place-items-center"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile: search in header row */}
        <div className="relative flex-1 min-w-0 md:hidden" ref={mobileSearchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#DC143C] pointer-events-none" />
          <input
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setOpenMenu(null); }}
            placeholder="Search deals, people, SOPs…"
            aria-label="Search"
            className="w-full h-10 pl-9 pr-9 py-2 rounded-xl bg-[#F5F7FA] border border-[#E5E7EB]
              text-[#111827] text-sm placeholder:text-[#9CA3AF]
              focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]/30 transition"
          />
          {searchQ && (
            <button
              type="button"
              onClick={() => { setSearchQ(""); setSearchResults([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#9CA3AF] hover:text-[#DC143C] hover:bg-[#FFF5F8]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {(searchQ.length >= 2) && (
            <SearchDropdown
              searching={searching}
              searchQ={searchQ}
              searchResults={searchResults}
              navigate={navigate}
              setSearchQ={setSearchQ}
              setSearchResults={setSearchResults}
            />
          )}
        </div>

        {/* Desktop: page title */}
        <div className="hidden md:flex items-center gap-2 shrink-0 min-w-0">
          <div>
            <h1 className="text-lg font-display font-semibold tracking-tight leading-tight text-[#111827]">
              {meta.title}
            </h1>
            <p className="text-[10px] text-[#6B7280] leading-tight">{meta.sub}</p>
          </div>
        </div>

        {/* Desktop / tablet search */}
        <div className="relative hidden md:block flex-1 min-w-0 max-w-md mx-2 lg:mx-4" ref={searchRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#DC143C]" />
          <input
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setOpenMenu(null); }}
            placeholder="Search deals, people, SOPs…"
            className="w-full min-h-[44px] pl-11 pr-16 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#E5E7EB]
              text-[#111827] text-sm placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition"
          />
          <kbd className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#DC143C] px-2 py-0.5 rounded-md">
            ⌘K
          </kbd>
          {(searchQ.length >= 2) && (
            <SearchDropdown
              searching={searching}
              searchQ={searchQ}
              searchResults={searchResults}
              navigate={navigate}
              setSearchQ={setSearchQ}
              setSearchResults={setSearchResults}
            />
          )}
        </div>

        {showDateRange && <DateRangeFilter className="hidden lg:flex shrink-0" />}

        <div className="hidden md:block flex-grow min-w-0" />

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-end shrink-0">

          {meta.ctaTo && (
            <button
              type="button"
              onClick={() => navigate(meta.ctaTo)}
              className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white
                px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-md transition mr-1"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{meta.cta}</span>
              <span className="sm:hidden">New</span>
            </button>
          )}

          {/* Quick Actions — tablet+ (mobile uses FAB) */}
          <div className="relative hidden md:inline-flex w-auto">
            <button
              onClick={() => setOpenMenu(openMenu === "quick" ? null : "quick")}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground
                px-3 py-2 rounded-xl text-xs md:text-sm font-medium hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Actions</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {openMenu === "quick" && (
              <div className="absolute right-0 top-full mt-2 popover-responsive bg-white rounded-2xl
                border border-[#FFD6E5] shadow-[0_12px_40px_rgba(220,20,60,0.12)] z-50">
                <div className="p-1 space-y-0.5">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button key={action.label} type="button" onClick={() => handleAction(action)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          text-xs md:text-sm text-[#111827] hover:bg-[#FFF0F5] transition">
                        <Icon className="w-4 h-4 text-[#DC143C] shrink-0" />
                        <span className="text-left font-semibold text-[#111827]">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Activity */}
          <Popover
            open={openMenu === "activity"}
            onToggle={() => {
              setOpenMenu(openMenu === "activity" ? null : "activity");
              if (openMenu !== "activity") refreshActivity();
            }}
            icon={<History className="w-[18px] h-[18px] text-[#DC143C]" />}
          >
            <div className="w-full sm:w-80 p-4 max-w-[calc(100vw-1.5rem)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#DC143C]">Recent Activity</p>
                <span className="text-[10px] text-[#9f1239] bg-[#fff0f6] px-2 py-0.5 rounded-full border border-[#fecdd3]">
                  {activities.length} events
                </span>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-xs text-center text-[#be123c] py-4">No activity yet</p>
                ) : activities.map((a) => (
                  <div key={a.id}
                    className="flex items-start gap-3 text-xs p-2 rounded-xl hover:bg-[#FFF5F8] transition">
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: a.entity === "lead" ? "#2563eb" : "#e11d48",
                      marginTop: 5, flexShrink: 0,
                    }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#111827] font-medium leading-tight truncate">{a.action}</p>
                      <p className="text-[#9CA3AF] mt-0.5 text-[10px]">
                        {a.user_name} · {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Popover>

          {/* Notifications */}
          <Popover
            open={openMenu === "notif"}
            onToggle={() => {
              setOpenMenu(openMenu === "notif" ? null : "notif");
              if (openMenu !== "notif") refreshNotifications();
            }}
            icon={<Bell className="w-[18px] h-[18px] text-[#DC143C]" />}
            badge={unreadCount > 0}
            badgeCount={unreadCount}
          >
            <div className="w-full sm:w-80 max-w-[calc(100vw-1.5rem)]">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-sm font-semibold text-[#DC143C]">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 text-[10px] text-[#be123c] hover:text-[#e11d48] transition">
                    <CheckCheck style={{ width: 12, height: 12 }} />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto px-2 pb-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-center text-[#be123c] py-6">No notifications</p>
                ) : notifications.map((n) => (
                  <div key={n.id}
                    className="p-3 rounded-xl hover:bg-[#FFF5F8] transition cursor-pointer"
                    style={{ opacity: n.is_read ? 0.6 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[#111827]">{n.title}</p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0 animate-pulse" />
                      )}
                    </div>
                    {n.body && <p className="text-[11px] text-[#6B7280] mt-1 leading-snug">{n.body}</p>}
                    <p className="text-[10px] text-[#9CA3AF] mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </Popover>

          {/* User */}
          <button
            onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}
            className="relative flex items-center justify-center gap-1.5 sm:gap-2 w-9 h-9 sm:w-auto sm:h-auto p-0 sm:pl-1 sm:pr-3 sm:py-1 rounded-full sm:rounded-xl shrink-0
              border border-[#E5E7EB] bg-white hover:bg-[#FFE4EC] transition"
          >
            <AdminDoodleAvatar size={28} shape="circle" className="shrink-0" />
            <div className="hidden lg:block text-left leading-tight">
              <div className="text-xs font-semibold text-[#DC143C]">{admin.fullName}</div>
              <div className="text-[10px] text-[#6B7280]">{admin.role}</div>
            </div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {openMenu === "user" && (
              <div className="absolute right-0 top-full mt-2 popover-responsive bg-white rounded-2xl
                border border-[#FFD6E5] shadow-[0_12px_40px_rgba(220,20,60,0.12)] p-2 z-50">
                {userMenuItems.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleUserMenu(i)}
                    className="w-full text-left px-3 py-2 text-sm rounded-xl transition cursor-pointer flex items-center gap-2 text-[#111827] hover:bg-[#FFF5F8] hover:text-[#DC143C]"
                  >
                    {i === "Admin Profile" && <User className="w-4 h-4 shrink-0" />}
                    {i === "Workspace Settings" && <Settings className="w-4 h-4 shrink-0" />}
                    {i === "Sign out" && <LogOut className="w-4 h-4 shrink-0" />}
                    {i}
                  </button>
                ))}
              </div>
            )}
          </button>
        </div>
      </div>

      {showDateRange && (
        <div className="lg:hidden px-2.5 pb-1 pt-0.5 border-t border-[#F3F4F6] bg-[#FAFAFA]/80">
          <DateRangeFilter compact className="w-full" />
        </div>
      )}
    </header>
  );
}

function SearchDropdown({ searching, searchQ, searchResults, navigate, setSearchQ, setSearchResults }) {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#FFD6E5]
      shadow-[0_12px_40px_rgba(220,20,60,0.12)] z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
      {searching ? (
        <div className="p-4 text-center text-xs text-[#be123c]">Searching…</div>
      ) : searchResults.length === 0 ? (
        <div className="p-4 text-center text-xs text-[#9f1239]">No results for "{searchQ}"</div>
      ) : (
        <div className="p-1">
          {searchResults.map((r) => {
            const cfg = TYPE_ICON[r.type] || TYPE_ICON.employee;
            const Icon = cfg.Icon;
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => {
                  navigate(r.type === "employee" ? "/team" : "/sales");
                  setSearchQ("");
                  setSearchResults([]);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl
                  hover:bg-[#FFF0F5] transition text-left touch-target"
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: cfg.bg, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 14, height: 14, color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">{r.name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{r.sub || r.email || r.role}</p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 20, background: cfg.bg, color: cfg.color,
                  textTransform: "capitalize", flexShrink: 0,
                }}>
                  {r.type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Popover({ open, onToggle, icon, badge, badgeCount, children }) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F8F9FC] transition grid place-items-center shrink-0"
      >
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full
            bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 popover-responsive bg-white rounded-2xl
          border border-[#FFD6E5] shadow-[0_12px_40px_rgba(220,20,60,0.12)] z-50 max-w-[calc(100vw-1rem)]">
          {children}
        </div>
      )}
    </div>
  );
}