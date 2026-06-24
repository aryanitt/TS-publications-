import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CheckSquare, Users, FileText, Phone, MessageSquare,
} from "lucide-react";

/** Core employee routes — Meetings, profile, etc. stay in sidebar / FAB */
const items = [
  { to: "/employee", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/employee/leads", label: "Leads", icon: Users },
  { to: "/employee/calls", label: "Calls", icon: Phone },
  { to: "/employee/follow-ups", label: "Follow", icon: MessageSquare },
  { to: "/employee/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/employee/sales-process", label: "SOP", icon: FileText },
];

export default function EmployeeMobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-area-pb"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Employee navigation"
    >
      <div className="grid grid-cols-6 h-14 max-w-[100vw]">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-w-0 px-0.5 py-1 text-[8px] font-semibold leading-none touch-target transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="truncate max-w-full">{i.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
