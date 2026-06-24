import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FileText, GitBranch, Users, BookUser, Coins,
} from "lucide-react";

/** Core admin routes — Settings & secondary pages stay in sidebar / menu */
const items = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/sales", label: "Sales", icon: GitBranch },
  { to: "/team", label: "Team", icon: BookUser },
  { to: "/sop", label: "SOP", icon: FileText },
  { to: "/incentives", label: "Pay", icon: Coins },
];

export default function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-area-pb"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Admin navigation"
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
