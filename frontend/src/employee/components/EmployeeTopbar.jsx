import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Search, Bell, Menu, Plus, ChevronDown, X,
  CheckSquare, MessageSquare, Phone, Calendar,
} from "lucide-react";
import EmployeeDoodleAvatar from "./EmployeeDoodleAvatar.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_ACTIVE, SEGMENT_BTN_INACTIVE } from "../../lib/segmentPills.js";

const QUICK_ACTIONS = [
  { label: "Add Lead",            icon: Plus,          to: "/employee/leads",        search: "?action=add" },
  { label: "Add Task",            icon: CheckSquare,   to: "/employee/tasks",        search: "?action=add" },
  { label: "Schedule Follow-up",  icon: MessageSquare, to: "/employee/follow-ups", search: "?action=add" },
  { label: "Log Call",            icon: Phone,         to: "/employee/calls" },
  { label: "Book Meeting",        icon: Calendar,      to: "/employee/meetings",   search: "?action=add" },
];

const PAGE_META = {
  "/employee": { title: "Dashboard", sub: "Overview · Pipeline · Agenda" },
  "/employee/tasks": { title: "My Tasks", sub: "Today · Upcoming · Previous" },
  "/employee/follow-ups": { title: "Follow-Up", sub: "Overdue · Due Today · Upcoming" },
  "/employee/calls": { title: "Call Reporting", sub: "Analytics · Team Performance · Lead Activity" },
  "/employee/leads": { title: "Pipeline", sub: "Real-time overview of your sales pipeline" },
  "/employee/pipeline": { title: "Pipeline", sub: "Real-time overview of your sales pipeline" },
  "/employee/sales-process": { title: "Sales Process", sub: "SOP · Cross-Selling · Scripts · Checklist" },
  "/employee/assets": { title: "Assets", sub: "Brochures · Templates · Training" },
  "/employee/meetings": { title: "Meetings", sub: "Book and track meetings" },
  "/employee/profile": { title: "Profile", sub: "Your account and preferences" },
};

const CALL_PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const MOCK_NOTIFS = [
  { text: "Hot lead: Priya Sharma assigned", time: "2 mins ago" },
  { text: "Not picked — Suresh Jain (retry 1hr)", time: "18 mins ago" },
  { text: "Converted: InfoSystems — ₹12L", time: "1 hour ago" },
];

export default function EmployeeTopbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { employee } = useEmployee();
  const meta = pathname.startsWith("/employee/sales-process/") && pathname !== "/employee/sales-process"
    ? { title: "SOP Detail", sub: "Full playbook · Scripts · Checklist" }
    : PAGE_META[pathname] || { title: "Employee Panel", sub: "" };
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const quickRef = useRef(null);
  const isCallsPage = pathname === "/employee/calls";
  const callPeriod = searchParams.get("period") || "today";

  const setCallPeriod = (period) => {
    setSearchParams({ period }, { replace: true });
  };

  const handleQuickAction = (action) => {
    setQuickOpen(false);
    navigate(`${action.to}${action.search ?? ""}`);
  };

  useEffect(() => {
    const onClick = (e) => {
      if (quickRef.current && !quickRef.current.contains(e.target)) {
        setQuickOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-sm overflow-x-clip">
        <div className="flex items-center gap-2 px-3 sm:px-4 lg:px-8 py-2 min-h-[52px] md:min-h-20 min-w-0">
          <button
            type="button"
            onClick={onMenu}
            className="w-9 h-9 -ml-1 rounded-xl hover:bg-[#FFF5F8] text-[#DC143C] lg:hidden transition-all duration-200 shrink-0 grid place-items-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile search */}
          <div className="relative flex-1 min-w-0 md:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#DC143C] pointer-events-none" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search leads, tasks…"
              aria-label="Search"
              className="w-full h-9 pl-9 pr-8 py-1.5 rounded-xl bg-[#F5F7FA] border border-[#E5E7EB]
                text-[#111827] text-sm placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]/30 transition"
            />
            {searchQ && (
              <button
                type="button"
                onClick={() => setSearchQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[#9CA3AF] hover:text-[#DC143C] hover:bg-[#FFF5F8]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop title */}
          <div className="hidden md:block shrink-0 min-w-0">
            <h1 className="text-lg font-display font-semibold tracking-tight leading-tight text-[#111827]">{meta.title}</h1>
            <p className="text-[10px] text-[#6B7280] leading-tight">{meta.sub}</p>
          </div>

          <div className="relative hidden md:block flex-1 min-w-0 max-w-md mx-2 lg:mx-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#DC143C]" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search leads, tasks, meetings…"
              className="w-full min-h-[44px] pl-11 pr-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#E5E7EB] text-[#111827] text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition"
            />
          </div>

          <div className="hidden md:block flex-grow min-w-0" />

          {isCallsPage && (
            <div className={`${SEGMENT_WRAP} hidden sm:inline-flex mr-1 shrink-0`}>
              {CALL_PERIODS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCallPeriod(id)}
                  className={`${SEGMENT_BTN} ${
                    callPeriod === id ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-1.5 justify-end shrink-0">
            {/* Quick Actions — tablet+ (mobile uses FAB) */}
            <div ref={quickRef} className="relative hidden md:inline-flex w-auto mr-1">
              <button
                type="button"
                onClick={() => setQuickOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs md:text-sm font-medium hover:bg-primary/90 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Quick Actions</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {quickOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-[#FFD6E5] shadow-[0_12px_40px_rgba(220,20,60,0.12)] z-50">
                  <div className="p-1 space-y-0.5">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => handleQuickAction(action)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm text-[#111827] hover:bg-[#FFF0F5] transition"
                        >
                          <Icon className="w-4 h-4 text-[#DC143C] shrink-0" />
                          <span className="text-left font-semibold">{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#E5E7EB] bg-white grid place-items-center text-slate-500 hover:border-rose-200 hover:text-rose-600 transition shrink-0"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-[#DC143C]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 border-2 border-white" />
            </button>

            <Link
              to="/employee/profile"
              className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[#FFF5F8] transition border border-[#E5E7EB] bg-white shrink-0"
            >
              <EmployeeDoodleAvatar size={32} shape="circle" />
              <div className="hidden lg:block text-left min-w-0">
                <div className="text-xs font-bold text-rose-800 truncate max-w-[100px]">{employee.name.split(" ")[0]}</div>
                <div className="text-[10px] text-slate-400 truncate">{employee.role}</div>
              </div>
            </Link>

            <Link
              to="/employee/profile"
              className="sm:hidden w-9 h-9 rounded-full border border-[#E5E7EB] bg-white grid place-items-center shrink-0 hover:bg-[#FFE4EC] transition"
              aria-label="Profile"
            >
              <EmployeeDoodleAvatar size={28} shape="circle" />
            </Link>
          </div>
        </div>

        {isCallsPage && (
          <div className="sm:hidden px-2.5 pb-1 pt-0.5 border-t border-[#F3F4F6] bg-[#FAFAFA]/80">
            <div className={`${SEGMENT_WRAP} w-full`}>
              {CALL_PERIODS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCallPeriod(id)}
                  className={`flex-1 ${SEGMENT_BTN} ${
                    callPeriod === id ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div className="fixed top-[3.25rem] right-3 sm:right-6 z-50 w-[min(100vw-1.5rem,320px)] rounded-2xl border border-[#FFD6E5] bg-white shadow-[0_12px_40px_rgba(220,20,60,0.12)] p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-display font-bold text-slate-900">Notifications</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">5 New</span>
            </div>
            {MOCK_NOTIFS.map((n) => (
              <div key={n.text} className="flex gap-2.5 py-2.5 border-b border-rose-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{n.text}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function usePageMeta(pathname) {
  return PAGE_META[pathname] || { title: "Employee Panel", sub: "" };
}
