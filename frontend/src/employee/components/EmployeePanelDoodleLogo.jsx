/** Hand-drawn brand mark for the Employee Panel sidebar */

const S = {
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export default function EmployeePanelDoodleLogo({ size = 36, className = "" }) {
  const radius = size >= 40 ? "rounded-xl" : "rounded-lg";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border-2 border-slate-600/80 bg-gradient-to-br from-sky-950/40 via-slate-900 to-indigo-950/30 shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${radius} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* background blobs */}
        <circle cx="16" cy="18" r="9" fill="#38bdf8" fillOpacity="0.2" />
        <circle cx="64" cy="56" r="10" fill="#818cf8" fillOpacity="0.18" />
        <circle cx="58" cy="16" r="5" fill="#fbbf24" fillOpacity="0.25" />

        {/* briefcase — employee workspace */}
        <rect x="22" y="32" width="36" height="26" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2.2" {...S} />
        <path d="M30 32 V28 C30 24 34 22 40 22 C46 22 50 24 50 28 V32" stroke="#94a3b8" strokeWidth="2.2" fill="none" {...S} />
        <path d="M22 42 H58" stroke="#475569" strokeWidth="1.5" {...S} />

        {/* EP letters on briefcase */}
        <text
          x="40"
          y="50"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#38bdf8"
          fontFamily="system-ui, sans-serif"
        >
          EP
        </text>

        {/* checklist doodle */}
        <rect x="52" y="24" width="14" height="16" rx="2.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.8" {...S} />
        <path d="M55 30 L57 32 L61 28" stroke="#34d399" strokeWidth="1.8" {...S} />
        <path d="M55 36 H62" stroke="#475569" strokeWidth="1.2" {...S} />

        {/* phone headset hint */}
        <path d="M14 48 C14 42 18 38 22 38" stroke="#6366f1" strokeWidth="2" {...S} />
        <rect x="10" y="46" width="6" height="9" rx="3" fill="#312e81" stroke="#6366f1" strokeWidth="1.5" />

        {/* sparkles */}
        <path d="M68 22 l1.2 2.4 -2.4 1.2 2.4 1.2 -1.2 2.4 1.2 -2.4 2.4 -1.2 -2.4 -1.2z" fill="#fbbf24" fillOpacity="0.8" />
        <path d="M10 62 l1 2 -2 1 2 1 -1 2 -1 -2 -2 -1 2 -1z" fill="#38bdf8" fillOpacity="0.7" />
      </svg>
    </div>
  );
}
