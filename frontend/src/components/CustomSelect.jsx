import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { initialsFromName } from "../lib/adminProfile.js";

const AVATAR_COLORS = ["#be123c", "#2563eb", "#7c3aed", "#10b981", "#ea580c", "#0891b2"];

export function colorForName(name) {
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * 17) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function MiniAvatar({ name, size = 28 }) {
  const initials = initialsFromName(name);
  const bg = colorForName(name);
  return (
    <span
      className="rounded-lg grid place-items-center text-[10px] font-bold text-white shrink-0 shadow-sm"
      style={{ width: size, height: size, background: bg }}
    >
      {initials}
    </span>
  );
}

export function CustomSelect({
  label,
  value,
  onChange,
  options = [],
  icon: Icon,
  compact = false,
  placeholder = "Select…",
  searchable = false,
  showAvatars = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label?.toLowerCase().includes(q) ||
        o.subtitle?.toLowerCase().includes(q),
    );
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return undefined;
    }
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const triggerH = compact ? "h-9" : "h-10";
  const textSize = compact ? "text-[11px] sm:text-sm" : "text-sm";

  return (
    <div className={`relative min-w-0 ${className}`} ref={rootRef}>
      {label && (
        <label className={`font-bold text-slate-400 uppercase tracking-wider block ${compact ? "text-[9px] mb-1" : "text-[10px] mb-1.5"}`}>
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full min-w-0 ${triggerH} px-3 rounded-xl border bg-white text-left font-semibold outline-none transition flex items-center gap-2 ${
          open ? "border-rose-400 ring-2 ring-rose-100" : "border-rose-100 hover:border-rose-200"
        } ${textSize}`}
      >
        {Icon && <Icon className={`text-rose-300 shrink-0 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />}
        {showAvatars && selected?.label && <MiniAvatar name={selected.label} size={compact ? 22 : 26} />}
        <span className={`flex-1 truncate ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl border border-rose-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] overflow-hidden animate-fade-in">
          {searchable && (
            <div className="p-2 border-b border-rose-50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-8 pl-8 pr-2 rounded-lg border border-rose-100 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-rose-300"
                  autoFocus
                />
              </div>
            </div>
          )}

          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-400">No matches</li>
            ) : (
              filtered.map((opt) => {
                const active = String(opt.value) === String(value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition ${
                        active
                          ? "bg-rose-50 text-rose-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {showAvatars && <MiniAvatar name={opt.label} />}
                      <span className="flex-1 min-w-0">
                        <span className={`block text-xs font-bold truncate ${active ? "text-rose-800" : "text-slate-800"}`}>
                          {opt.label}
                        </span>
                        {opt.subtitle && (
                          <span className="block text-[10px] text-slate-400 truncate mt-0.5">{opt.subtitle}</span>
                        )}
                      </span>
                      {active && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function EmployeeListPicker({
  employees = [],
  selectedId,
  onSelect,
  search = "",
  onSearchChange,
  loading = false,
  emptyMessage = "No employees found.",
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.team?.toLowerCase().includes(q),
    );
  }, [employees, search]);

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Team Members</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {loading ? "Loading…" : `${employees.length} employee${employees.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search employee…"
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-xl border border-rose-100 bg-white text-slate-800 placeholder:text-slate-400 text-xs font-medium outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-50 transition"
        />
      </div>

      <div className="space-y-1 overflow-y-auto max-h-56 pr-0.5 -mr-0.5">
        {loading && (
          <div className="py-8 text-center">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-rose-100 border-t-rose-500 animate-spin" />
            <p className="text-xs text-slate-400 mt-2">Loading employees…</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-slate-400 py-8 text-center leading-relaxed">{emptyMessage}</p>
        )}
        {!loading && filtered.map((e) => {
          const active = Number(selectedId) === Number(e.id);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e.id)}
              className={`w-full p-2.5 rounded-xl text-left transition flex items-center gap-2.5 group ${
                active
                  ? "bg-gradient-to-r from-rose-50 to-white border border-rose-200 shadow-sm"
                  : "border border-transparent hover:bg-slate-50 hover:border-slate-100"
              }`}
            >
              <MiniAvatar name={e.name} size={32} />
              <span className="flex-1 min-w-0">
                <span className={`block text-xs font-bold truncate ${active ? "text-rose-800" : "text-slate-800"}`}>
                  {e.name}
                </span>
                <span className="block text-[10px] text-slate-400 truncate mt-0.5">{e.team || "General"}</span>
              </span>
              {active && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-rose-600 text-white grid place-items-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
