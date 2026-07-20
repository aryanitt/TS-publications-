import { NavLink } from "react-router-dom";

/** Fixed bottom navigation shell — safe-area aware, thumb-friendly tap targets. */
export default function BottomNavShell({ label, children }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-rose-100/80 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={label}
    >
      <div className="flex items-stretch justify-around gap-0.5 h-[4.25rem] max-w-[100vw] px-1">
        {children}
      </div>
    </nav>
  );
}

export function BottomNavItem({ to, end, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 max-w-[5.5rem] px-1 py-1.5 rounded-xl text-[10px] font-semibold leading-tight transition-colors ${
          isActive
            ? "text-[#be123c] bg-rose-50"
            : "text-slate-500 hover:text-slate-700"
        }`
      }
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="truncate max-w-full text-center">{label}</span>
    </NavLink>
  );
}
