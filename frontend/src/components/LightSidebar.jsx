import { Link } from "react-router-dom";
import { ChevronRight, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

export const SIDEBAR_SHELL = `
  fixed lg:sticky top-0 left-0 z-50 h-screen shrink-0
  bg-[#0f172a] border-r border-slate-800
  flex flex-col overflow-hidden
  transition-[width,transform] duration-200 ease-out
`;

export function SidebarLogo({ initials, title, subtitle, to, onNavigate, isExpanded, logo }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 min-w-0 group" onClick={onNavigate}>
      {logo ?? (
        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 shadow-sm grid place-items-center shrink-0 group-hover:bg-slate-700 transition-colors">
          <span className="text-[10px] font-black text-white tracking-tight">{initials}</span>
        </div>
      )}
      {isExpanded && (
        <div className="overflow-hidden min-w-0">
          <div className="font-display text-[15px] font-bold tracking-tight whitespace-nowrap text-slate-100 truncate leading-tight">
            {title}
          </div>
          <div className="text-[10px] font-medium text-slate-500 whitespace-nowrap truncate mt-0.5">
            {subtitle}
          </div>
        </div>
      )}
    </Link>
  );
}

export function SidebarHeader({ children, isExpanded, onClose, onToggleCollapse, collapsed }) {
  return (
    <div className="flex items-center gap-2 px-3 h-14 shrink-0 border-b border-slate-800 bg-[#0f172a]">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        type="button"
        onClick={onClose}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 shrink-0 border border-transparent hover:border-slate-700 transition"
      >
        <X className="w-5 h-5" />
      </button>
      {isExpanded && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition shrink-0"
          title={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

export function SidebarSectionLabel({ children, isExpanded }) {
  if (!isExpanded) return null;
  return (
    <div className="flex items-center gap-2 px-2 mb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 shrink-0">
        {children}
      </span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

export function SidebarNavItem({ isActive, isExpanded, icon: Icon, label }) {
  return (
    <div
      className={`relative flex items-center gap-2.5 rounded-md transition-colors duration-150 ${
        !isExpanded ? "justify-center p-2 mx-auto w-9 h-9" : "pl-2.5 pr-2.5 py-2 min-h-[36px]"
      } ${
        isActive
          ? "bg-slate-800 text-slate-100 ring-1 ring-slate-700 font-semibold"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium"
      }`}
      title={!isExpanded ? label : undefined}
    >
      {isActive && isExpanded && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-rose-500" />
      )}
      <Icon
        className={`shrink-0 w-4 h-4 ${
          isActive ? "text-rose-400" : "text-slate-500 group-hover:text-slate-300"
        }`}
        strokeWidth={isActive ? 2.25 : 2}
      />
      {isExpanded && (
        <span className="truncate text-[12px] leading-tight">{label}</span>
      )}
    </div>
  );
}

export function SidebarSwitchLink({ to, onClick, icon: Icon, label, isExpanded }) {
  if (!isExpanded) return null;
  return (
    <Link
      to={to}
      onClick={onClick}
      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition mb-2"
    >
      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-slate-300" />
      <span className="truncate">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-600 group-hover:text-slate-400 shrink-0" />
    </Link>
  );
}

export function SidebarProfileCard({ isExpanded, onClick, avatar, name, role, title }) {
  if (!isExpanded) {
    return (
      <div className="flex justify-center py-1">
        <button
          type="button"
          onClick={onClick}
          title={title || name}
          className="rounded-full ring-2 ring-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
        >
          {avatar}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition text-left"
    >
      <div className="shrink-0 scale-90 origin-left">{avatar}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-slate-100 truncate leading-tight">{name}</div>
        <div className="text-[10px] text-slate-500 font-medium truncate">{role}</div>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" title="Online" />
      </div>
    </button>
  );
}

export function SidebarCollapseHint({ show }) {
  if (!show) return null;
  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 grid place-items-center shadow-sm">
        <ChevronRight className="w-3 h-3 text-slate-500" />
      </div>
    </div>
  );
}

export function SidebarAvatarInitials({ initials }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-600 grid place-items-center shrink-0">
      <span className="text-[9px] font-bold text-white">{initials}</span>
    </div>
  );
}

export function SidebarNav({ children }) {
  return (
    <nav className="flex-1 px-2 py-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-none">
      {children}
    </nav>
  );
}

export function SidebarFooter({ children }) {
  return (
    <div className="p-2.5 border-t border-slate-800 shrink-0 bg-[#0f172a]">
      {children}
    </div>
  );
}
